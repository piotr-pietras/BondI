// SPDX-License-Identifier: MIT
pragma solidity <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract BondI {
  string public name = "BondI";

  event BondIssued(address indexed issuer, string indexed title);
  event BondBought(
    address indexed issuer,
    address indexed buyer,
    uint256 indexed amount
  );
  event CapitalCollected(address indexed issuer);
  event PeacefulResolved(address indexed issuer, string indexed title);
  event ForceResolved(address indexed issuer, string indexed title);
  // event Dev(uint256 indexed x, string indexed y);

  mapping(address => mapping(uint256 => mapping(string => string)))
    public bondDescription; // string description of bond
  mapping(address => mapping(uint256 => mapping(string => uint256)))
    public bondInfo; // uint information of bond
  mapping(address => mapping(uint256 => address)) public bondToken; // expected token for bond unit
  mapping(address => mapping(uint256 => uint256)) public ethLocked; // issuer eth locked for credibilities

  mapping(address => mapping(uint256 => mapping(address => uint256)))
    public buyers;
  mapping(address => mapping(uint256 => uint256[])) public bondBags;

  address[] blackList;

  constructor() {}

  //----------------------------------------------------------------
  //Minor functions
  //----------------------------------------------------------------
  //Sums up list of units of bond that were bought
  function totalBondBag(address issuer, uint256 id)
    public
    view
    returns (uint256)
  {
    uint256 units = 0;
    for (uint256 i = 0; i < bondBags[issuer][id].length; i++) {
      units += bondBags[issuer][id][i];
    }
    return units;
  }

  //Calculate total issuer's due
  function totalDue(address issuer, uint256 id) public view returns (uint256) {
    return totalBondBag(issuer, id) * bondInfo[issuer][id]["buybackRatio"];
  }

  //Calculate total issuer's capital
  function totalCapital(address issuer, uint256 id)
    public
    view
    returns (uint256)
  {
    return totalBondBag(issuer, id) * bondInfo[issuer][id]["sellRatio"];
  }

  //Locks eth for bond's issuer to rise credibilitie
  function lockEth(uint256 id) public payable {
    ethLocked[msg.sender][id] = ethLocked[msg.sender][id] + msg.value;
  }

  //Get back locked eth after peacful resolve
  function unlockEth(uint256 id) public payable {
    require(ethLocked[msg.sender][id] > 0, "No eth locked in bond");
    require(
      bondInfo[msg.sender][id]["status"] == 51,
      "You cannot decrease credibility right now becouse peaceful resolve has't occured yet"
    );
    (bool success, ) = msg.sender.call{ value: ethLocked[msg.sender][id] }("");
    require(success, "Failed to unlock eth");
    ethLocked[msg.sender][id] = 0;
  }

  //----------------------------------------------------------------
  //Major functions
  //----------------------------------------------------------------
  function issueBond(
    uint256 id,
    string memory title,
    string memory issuer,
    string memory description,
    string memory links,
    address tokenAddress,
    uint256 issuedAmount,
    uint256 sellRatio,
    uint256 buybackRatio,
    uint256 offeringBlocks,
    uint256 expireBlocks
  ) public returns (bool) {
    require(
      bondInfo[msg.sender][id]["status"] == 0,
      "Bond is already issued or is resolved"
    );

    bondDescription[msg.sender][id]["title"] = title; //simple bond title
    bondDescription[msg.sender][id]["issuer"] = issuer; //issuer precise idetification
    bondDescription[msg.sender][id]["description"] = description; //informations and credibilities
    bondDescription[msg.sender][id]["links"] = links; //links for more informations and credibilities
    bondToken[msg.sender][id] = tokenAddress; //expected token for bond unit
    bondInfo[msg.sender][id]["status"] = 100; // 0 - not exists / 51 - peaceful resolved / 52 - force resolved / 100 - created
    bondInfo[msg.sender][id]["issuedAmount"] = issuedAmount; //amount units of bond created
    bondInfo[msg.sender][id]["currentAmount"] = issuedAmount; //current amount of units held by issuer
    bondInfo[msg.sender][id]["sellRatio"] = sellRatio; //ratio for selling units for tokens, x tokens for 1 unit of bond [token/1unit]
    bondInfo[msg.sender][id]["buybackRatio"] = buybackRatio; //ratio for buying back units for tokens, x token for 1 unit of bond [token/1unit]
    bondInfo[msg.sender][id]["creationBlock"] = block.number; //number of block when bond was issued
    bondInfo[msg.sender][id]["offeringBlocks"] = offeringBlocks; //number of blocks until bond stops offering units for sell
    bondInfo[msg.sender][id]["expireBlocks"] = expireBlocks; //number of blocks until bond expire

    emit BondIssued(msg.sender, title);
    return (true);
  }

  function buyBond(
    address issuer,
    uint256 id,
    uint256 amount
  ) public returns (bool) {
    require(
      bondInfo[issuer][id]["status"] == 100,
      "Bond is not issued or is resolved"
    );
    require(
      (bondInfo[issuer][id]["creationBlock"] +
        bondInfo[issuer][id]["offeringBlocks"]) > block.number,
      "Bond's offering ended"
    );
    require(
      bondInfo[issuer][id]["currentAmount"] >= amount,
      "Not enough bond units"
    );

    ERC20 erc20 = ERC20(bondToken[issuer][id]);

    uint256 allowed = erc20.allowance(msg.sender, address(this));
    uint256 amountTokens = bondInfo[issuer][id]["sellRatio"] * amount;
    require(
      allowed >= amountTokens,
      "Too few tokens allowed to transferFrom to BondI"
    );

    erc20.transferFrom(msg.sender, address(this), amountTokens);

    buyers[issuer][id][msg.sender] += amount;
    bondBags[issuer][id].push(amount);
    bondInfo[issuer][id]["currentAmount"] -= amount;

    emit BondBought(issuer, msg.sender, amount);
    return true;
  }

  function sellBond(address issuer, uint256 id) public returns (bool) {
    require(
      (bondInfo[issuer][id]["creationBlock"] +
        bondInfo[issuer][id]["expireBlocks"]) < block.number,
      "Bond hasn't expired yet"
    );

    if (bondInfo[issuer][id]["status"] == 100) {
      forceResolve(issuer, id);
    }

    uint256 due = buyers[issuer][id][msg.sender] *
      bondInfo[issuer][id]["buybackRatio"];
    require(due > 0, "You don't own any units of the bond");

    ERC20 erc20 = ERC20(bondToken[issuer][id]);

    //If bond was resolved by issuer
    if (bondInfo[issuer][id]["status"] == 51) {
      erc20.transfer(msg.sender, due);
      buyers[issuer][id][msg.sender] = 0;
    }
    //If bond was forced by buyer
    else if (bondInfo[issuer][id]["status"] == 52) {
      uint256 current = totalBondBag(issuer, id);
      uint256 eth = (ethLocked[issuer][id] * buyers[issuer][id][msg.sender]) /
        current;

      (bool success, ) = msg.sender.call{ value: eth }("");
      require(success, "Failed to send eth");

      buyers[issuer][id][msg.sender] = 0;
    }

    return true;
  }

  function collectCapital(uint256 id) public returns (bool) {
    require(
      bondInfo[msg.sender][id]["status"] == 100,
      "Bond is not issued or is resolved"
    );
    require(
      bondInfo[msg.sender][id]["collected"] == 0,
      "Bond's capital has been collected already"
    );

    uint256 amountTokens = totalCapital(msg.sender, id);

    ERC20 erc20 = ERC20(bondToken[msg.sender][id]);
    erc20.transfer(msg.sender, amountTokens);

    bondInfo[msg.sender][id]["collected"] = 1;
    bondInfo[msg.sender][id]["offeringBlocks"] =
      block.number -
      bondInfo[msg.sender][id]["creationBlock"]; // end bond offering

    emit CapitalCollected(msg.sender);
    return true;
  }

  function peacefulResolve(uint256 id) public returns (bool) {
    require(
      bondInfo[msg.sender][id]["status"] == 100,
      "Bond is not issued or is resolved"
    );
    require(
      (bondInfo[msg.sender][id]["creationBlock"] +
        bondInfo[msg.sender][id]["offeringBlocks"]) < block.number,
      "Bond's offering has not ended yet"
    );
    require(
      (bondInfo[msg.sender][id]["creationBlock"] +
        bondInfo[msg.sender][id]["expireBlocks"]) > block.number,
      "Bond expired"
    );

    uint256 amountTokens = totalDue(msg.sender, id);
    if (amountTokens > 0) {
      ERC20 erc20 = ERC20(bondToken[msg.sender][id]);

      uint256 allowed = erc20.allowance(msg.sender, address(this));
      require(
        allowed >= amountTokens,
        "Too few tokens allowed to transferFrom to BondI"
      );

      erc20.transferFrom(msg.sender, address(this), amountTokens);
    }

    bondInfo[msg.sender][id]["status"] = 51;
    bondInfo[msg.sender][id]["expireBlocks"] =
      block.number -
      bondInfo[msg.sender][id]["creationBlock"];

    emit PeacefulResolved(msg.sender, bondDescription[msg.sender][id]["title"]);
    return true;
  }

  function forceResolve(address issuer, uint256 id) internal returns (bool) {
    bondInfo[issuer][id]["status"] = 52;
    blackList.push(issuer);

    emit ForceResolved(issuer, bondDescription[issuer][id]["title"]);
    return true;
  }
}
