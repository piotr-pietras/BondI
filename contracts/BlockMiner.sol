// SPDX-License-Identifier: MIT
pragma solidity <0.9.0;

//Mining simulator
contract BlockMiner {
    uint blocks = 0;

    constructor() {}

    function mine() public {
        blocks++;
    }
}