pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721.sol";

contract StarNotary is ERC721 { 

    struct Star { 
        string name;
        string story;
        string ra;
        string dec;
        string mag;
    }

    mapping(uint256 => Star) public tokenIdToStarInfo; 
    mapping(uint256 => uint256) public starsForSale;
    mapping(bytes32 => uint) public starHashMarker;

    function createStar(string _name, string _story, string _ra, string _dec, string _mag, uint256 _tokenId) public {
        require(!(checkIfStarExist(_ra, _dec, _mag)), "this star has already been registered");
        Star memory newStar = Star(_name, _story, _ra, _dec, _mag);

        tokenIdToStarInfo[_tokenId] = newStar;

        _mint(msg.sender, _tokenId);

        bytes32 starCoordinates = keccak256(abi.encodePacked(_ra, _dec, _mag));
        starHashMarker[starCoordinates] = 1;
    }

    function putStarUpForSale(uint256 _tokenId, uint256 _price) public { 
        require(this.ownerOf(_tokenId) == msg.sender, "you are not authorized to list this star");

        starsForSale[_tokenId] = _price;
    }

    function buyStar(uint256 _tokenId) public payable { 
        require(starsForSale[_tokenId] > 0, "this star is not for sale");
        
        uint256 starCost = starsForSale[_tokenId];
        address starOwner = this.ownerOf(_tokenId);
        require(msg.value >= starCost, "you did not pay enough ether for this star");

        _removeTokenFrom(starOwner, _tokenId);
        _addTokenTo(msg.sender, _tokenId);
        
        starOwner.transfer(starCost);

        if(msg.value > starCost) { 
            msg.sender.transfer(msg.value - starCost);
        }
    }

    function checkIfStarExist(string _ra, string _dec, string _mag) public view returns(bool) {
        bytes32 starCoordinates = keccak256(abi.encodePacked(_ra, _dec, _mag));
        return (starHashMarker[starCoordinates] != 0);
    }
}