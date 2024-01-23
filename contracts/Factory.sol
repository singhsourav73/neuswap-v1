// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.19;

import "./Exchange.sol";

contract Factory {
  mapping(address => address) public tokenToExchange;

  function createExchange(address _tokenAddress) public returns (address) {
    require(_tokenAddress != address(0),  "Invalid token Address");
    require(tokenToExchange[_tokenAddress] == address(0), "Exchange already exist");

    Exchange exchange = new Exchange(_tokenAddress);
    tokenToExchange[_tokenAddress] = address(exchange);

    return address(exchange);
  }

  function getExhabge(address _tokenAddress) public view returns (address) {
    return tokenToExchange[_tokenAddress];
  }
}