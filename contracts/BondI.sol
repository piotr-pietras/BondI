// SPDX-License-Identifier: MIT
pragma solidity <0.9.0;

import "@openzeppelin/contracts/utils/Strings.sol";

contract BondI {
    address _owner;
    string _name = "BondI";

    event BondIssued(address indexed, string indexed title);

    //BONDS------------------------
    //name - company/institution/person name
    //extra - more info for make issuer more reliable
    //price - example 1usd per bond
    //buyBack - example 2use per bond
    //blocks - bond must by buy backed by certain block
    //locked - eth locked
    mapping(address => mapping(string => string)) public bonds;
    mapping(address => mapping(string => string)) public blackList;

    constructor() {
        _owner = msg.sender;
    }

    function name() public view returns(string memory) {
        return(_name);
    }

    receive() external payable {

    }

    function issueBond(
        string memory title, 
        string memory extra,
        uint price,
        uint amount,
        uint buyBack,
        uint blocks) public{
        
        bonds[msg.sender]["title"] = title;
        bonds[msg.sender]["extra"] = extra;
        bonds[msg.sender]["price"] = Strings.toString(price);
        bonds[msg.sender]["amount"] = Strings.toString(amount);
        bonds[msg.sender]["buyBack"] = Strings.toString(buyBack);
        bonds[msg.sender]["blocks"] = Strings.toString(blocks);
        bonds[msg.sender]["ethLocked"] = Strings.toString(0);

        emit BondIssued(msg.sender, title);
    }

}