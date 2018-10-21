pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721.sol";

contract StarNotary is ERC721 { 

    struct Star { 
        string name;
        string story;
        string dec;
        string mag;
        string cent;
    }

    //map tokenId to the Star struct
    mapping(uint256 => Star) public tokenIdToStarInfo;

    //map starsForSale by tokenId to price 
    mapping(uint256 => uint256) public starsForSale;

    //map which star coordinate hashes have been claimed
    mapping(bytes32 => uint) public starHashMarker;

    /**
   * @dev Public function for claiming a star
   * Reverts if the coordinates have already been used
   * @param _name string name of the star being claimed
   * @param _story string name of the star being claimed
   * @param _dec string declination of the star being claimed
   * @param _mag string magnitude of the star being claimed
   * @param _cent string centaurus of the star being claimed
   * @param _tokenId uint256 ID of the token being claimed
   */
    function createStar(string _name, string _story, string _dec, string _mag, string _cent, uint256 _tokenId) public {
        
        //make sure a star with the same coordinates hasn't been registered
        require(!(checkIfStarExist(_dec, _mag, _cent)), "this star has already been registered");
        Star memory newStar = Star(_name, _story, _dec, _mag, _cent);

        //store the star according to the tokenId
        tokenIdToStarInfo[_tokenId] = newStar;

        //issue the new token to the sender and emit Transfer event
        _mint(msg.sender, _tokenId);

        //save the star coordinates according to hash
        bytes32 starCoordinates = keccak256(abi.encodePacked(_dec, _mag, _cent));
        starHashMarker[starCoordinates] = 1;
    }

    /**
   * @dev Public function for putting a star up for sale
   * Reverts if the sender is not the owner of the star
   * @param _tokenId uint256 ID of the token being listed for sale
   * @param _price uint256 price of the token being listed for sale in Ether
   */
    function putStarUpForSale(uint256 _tokenId, uint256 _price) public { 
        //make sure only the owner of the star can put it up for sale
        require(this.ownerOf(_tokenId) == msg.sender, "you are not authorized to list this star");

        //list the star for sale according to it's price
        starsForSale[_tokenId] = _price;
    }

    /**
   * @dev Public function for buying a star
   * Reverts if the star isn't for sale or if the sender didn't send enough Ether
   * @param _tokenId uint256 ID of the token for the star being purchased
   */
    function buyStar(uint256 _tokenId) public payable { 
        //make sure the star is for sale
        require(starsForSale[_tokenId] > 0, "this star is not for sale");
        
        //make sure enough money was paid
        uint256 starCost = starsForSale[_tokenId];
        address starOwner = this.ownerOf(_tokenId);
        require(msg.value >= starCost, "you did not pay enough ether for this star");

        //remove token from seller and add to buyer
        _removeTokenFrom(starOwner, _tokenId);
        _addTokenTo(msg.sender, _tokenId);
        
        //transfer appropriate funds
        starOwner.transfer(starCost);

        //return funds not used
        if(msg.value > starCost) { 
            msg.sender.transfer(msg.value - starCost);
        }
    }

    /**
    * @dev Public function for determining if a star already exists
    * @param _dec string declination of the star being checked
    * @param _mag string magnitude of the star being checked
    * @param _cent string centaurus of the star being checked
    */
    function checkIfStarExist(string _dec, string _mag, string _cent) public view returns(bool) {
        //hash the stars coordinates
        bytes32 starCoordinates = keccak256(abi.encodePacked(_dec, _mag, _cent));
        //check whether the hash of the coordinates are mapped already
        return (starHashMarker[starCoordinates] != 0);
    }
}