const StarNotary = artifacts.require('StarNotary')

contract('StarNotary', accounts => { 

    beforeEach(async function() { 
        this.contract = await StarNotary.new({from: accounts[0]})
    })
    
    describe('can create a star', () => { 

        let star = ['Star Power 103!', "I love my wonderful star", "ra_032.155", "dec_121.874", "mag_245.978"];

        beforeEach(async function () { 
            await this.contract.createStar(...star, 1, {from: accounts[0]})    
        });

        it('can create a star and have correct attributes', async function () { 
            
            const res = await this.contract.tokenIdToStarInfo(1);
            assert.deepEqual(res, star);
        });

        it('should correctly mark the owner of a created star', async function() {

            assert.equal(await this.contract.ownerOf(1), accounts[0]);
        });

        it('cannot create a star with the same coordinates', async function() {

            try {
                await this.contract.createStar(...star, 2, {from: accounts[1]});
                assert.equal(0, 1); //shouldn't reach this
            }
            catch(err) {
                assert.equal(err.message, "VM Exception while processing transaction: revert this star has already been registered");
            }
        });

        it('can create two different stars', async function() {

            let secondStar = ['Awesome star', 'Found it online', 'ra_032.155', 'dec_121.874', 'mag_245.979'];
            await this.contract.createStar(...secondStar, 2, {from: accounts[0]});
            const res = await this.contract.tokenIdToStarInfo(2);
            assert.deepEqual(res, secondStar);
        });

        it('cannot create two stars with same tokenId', async function() {

            let secondStar = ['Awesome star', 'Found it online', 'ra_032.155', 'dec_121.874', 'mag_245.979'];

            try {
                await this.contract.createStar(...secondStar, 1, {from: accounts[1]});
                assert.equal(0, 1); //shouldn't reach this
            }
            catch(err) {
                assert.equal(err.message, "VM Exception while processing transaction: revert");
            }
        });
    })

    describe('buying and selling stars', () => { 
        let user1 = accounts[1]
        let user2 = accounts[2]
        let randomMaliciousUser = accounts[3]
        
        let star = ['Star Power 103!', "I love my wonderful star", "ra_032.155", "dec_121.874", "mag_245.978"];
        let starId = 1
        let starPrice = web3.toWei(.01, "ether")

        beforeEach(async function () { 
            await this.contract.createStar(...star, starId, {from: user1})    
        })

        it('user1 can put up their star for sale', async function () { 
            assert.equal(await this.contract.ownerOf(starId), user1)
            await this.contract.putStarUpForSale(starId, starPrice, {from: user1})
            
            assert.equal(await this.contract.starsForSale(starId), starPrice)
        })

        it('user2 cannot put user1 star up for sale', async function() {

            try {
                await this.contract.putStarUpForSale(starId, starPrice, {from: user2});
                assert.equal(0, 1); //shouldn't reach this
            }
            catch(err) {
                assert.equal(err.message, "VM Exception while processing transaction: revert you are not authorized to list this star");
            }
        });

        it('cannot buy a star thats not for sale', async function() {

            try {
                await this.contract.buyStar(starId, {from: user2, value: starPrice, gasPrice: 0});
                assert.equal(0, 1); //shouldn't reach this
            }
            catch(err) {
                assert.equal(err.message, "VM Exception while processing transaction: revert this star is not for sale");
            }
        });


        describe('user2 can buy a star that was put up for sale', () => { 
            beforeEach(async function () { 
                await this.contract.putStarUpForSale(starId, starPrice, {from: user1})
            })


            it('user2 is the owner of the star after they buy it', async function() { 
                await this.contract.buyStar(starId, {from: user2, value: starPrice, gasPrice: 0})
                assert.equal(await this.contract.ownerOf(starId), user2)
            })

            it('user2 must pay enough for star', async function() {
                let payAmount = web3.toWei(.005, "ether");
                try {
                    await this.contract.buyStar(starId, {from: user2, value: payAmount, gasPrice: 0});
                    assert.equal(0, 1); //shouldn't reach this
                }
                catch(err) {
                    assert.equal(err.message, "VM Exception while processing transaction: revert you did not pay enough ether for this star");
                }
            });

            it('user2 ether balance changed correctly', async function () { 
                let overpaidAmount = web3.toWei(.05, 'ether')
                const balanceBeforeTransaction = web3.eth.getBalance(user2)
                await this.contract.buyStar(starId, {from: user2, value: overpaidAmount, gasPrice: 0})
                const balanceAfterTransaction = web3.eth.getBalance(user2)

                assert.equal(balanceBeforeTransaction.sub(balanceAfterTransaction), starPrice)
            })
        })
    })

    describe('checkIfStarExist distinguishes whether a star coordinates exist', () => { 

        let star = ['Star Power 103!', "I love my wonderful star", "ra_032.155", "dec_121.874", "mag_245.978"];

        it('should return true when a stars coordinates have been used', async function () { 
            
            await this.contract.createStar(...star, 1, {from: accounts[0]});
            assert(await this.contract.checkIfStarExist(star[2], star[3], star[4]));
        });

        it('should return false when a stars coordinates have not been used', async function () {

            assert.isFalse(await this.contract.checkIfStarExist(star[2], star[3], star[4]));
        });
    });

    describe('approving and transfering tokens', () => {

        let star = ['Star Power 103!', "I love my wonderful star", "ra_032.155", "dec_121.874", "mag_245.978"];

        it('should correctly approve the address and return the approve address', async function() {

            await this.contract.createStar(...star, 1, {from: accounts[0]});
            await this.contract.approve(accounts[1], 1);
            assert.equal(await this.contract.getApproved(1), accounts[1]);
        });

        it('should approve transfer of all and return true for approved address', async function() {

            await this.contract.setApprovalForAll(accounts[1], true, {from: accounts[0]});
            assert(await this.contract.isApprovedForAll(accounts[0], accounts[1]));

        });

        it('should revoke transfer of all and return false for address', async function() {

            await this.contract.setApprovalForAll(accounts[1], true, {from: accounts[0]});
            await this.contract.setApprovalForAll(accounts[1], false, {from: accounts[0]});
            assert.isFalse(await this.contract.isApprovedForAll(accounts[0], accounts[1]));
        });

        it('should transfer token to another address', async function() {

            await this.contract.createStar(...star, 1, {from: accounts[0]});
            await this.contract.safeTransferFrom(accounts[0], accounts[1], 1);
            assert.equal(await this.contract.ownerOf(1), accounts[1]);
        });


    });
})