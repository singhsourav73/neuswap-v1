// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IExchange {
  function ethToTokenSwap(uint _minTokens) external payable;
  function ethToTokenTransfer(uint256 _minTokens, address _recipient) external payable; 
}

interface IFactory {
  function getExchange(address _tokenAddress) external returns (address);
}

contract Exchange is ERC20 {
  address public tokenAddress;
  address public factoryAddress;

  constructor(address _token) ERC20("Neuswap-V1", "NEU-V1") {
    require(_token != address(0), "invalid token address");
    tokenAddress = _token;
    factoryAddress = msg.sender;
  }

  function addLiquidity(uint256 _tokenAmount) public payable returns (uint256) {
    if (getReserve() == 0) {
      IERC20 token = IERC20(tokenAddress);
      token.transferFrom(msg.sender, address(this), _tokenAmount);

      uint256 liquidity = address(this).balance;
      _mint(msg.sender, liquidity);
      return liquidity;
    } else {
      uint256 ethReserve = address(this).balance - msg.value;
      uint256 tokenReserve = getReserve();
      uint256 tokenAmount = (msg.value * tokenReserve) / ethReserve;
      require(_tokenAmount >= tokenAmount, "Insufficient Token Amount");

      IERC20 token = IERC20(tokenAddress);
      token.transferFrom(msg.sender, address(this), tokenAmount);

      uint256 liquidity = (totalSupply() * msg.value) / ethReserve;
      _mint(msg.sender, liquidity);
      return liquidity;
    }
  }

  function removeLiquidity(uint256 _amount) public returns (uint256, uint256) {
    require(_amount > 0, "Invalid Amount");

    uint256 ethAmount = (address(this).balance * _amount)/ totalSupply();
    uint256 tokenAmount = (getReserve() * _amount) / totalSupply();

    _burn(msg.sender, _amount);
    (bool ok,) = msg.sender.call{value: ethAmount}("");
    require(ok, "Eth Transfer failed");
    IERC20(tokenAddress).transfer(msg.sender, tokenAmount);

    return (ethAmount, tokenAmount);
  } 

  function getReserve() public view returns (uint256) {
    return IERC20(tokenAddress).balanceOf(address(this));
  }

  function getPrice(uint256 inputReserve, uint256 outputReserve) public pure returns (uint256) {
    require(inputReserve > 0 && outputReserve > 0, "Invalid reserves");
    return inputReserve * 1000 / outputReserve;
  }

  function getAmount(uint256 inputAmount, uint256 inputReserve, uint256 outputReserve) private pure returns (uint256) {
    require(inputReserve > 0 && outputReserve > 0, "Invalid Reserve");
    return ((inputAmount * 99) * outputReserve)/ ((inputReserve * 100) + (inputAmount * 99));
  }

  function getTokenAmount(uint256 _ethSold) public view returns (uint256) {
    require(_ethSold > 0, "ethSold is too small");
    uint256 tokenReserve = getReserve();
    return getAmount(_ethSold, address(this).balance, tokenReserve);
  }

  function getEthAmount(uint256 _tokenSold) public view returns (uint256) {
    require(_tokenSold > 0, "tokenSold is too small");
    uint256 tokenReserve = getReserve();
    return getAmount(_tokenSold, tokenReserve, address(this).balance);
  }

  function ethToToken(uint _minTokens, address recipient) private {
    uint256 tokenReserve = getReserve();
    uint tokenBought = getAmount(msg.value, address(this).balance - msg.value, tokenReserve);
    require(tokenBought >= _minTokens, "Insufficient minimum output amount");
    IERC20(tokenAddress).transfer(recipient, tokenBought);
  }

  function ethToTokenSwap(uint256 _minTokens) public payable {
    ethToToken(_minTokens, msg.sender);
  }

  function ethToTokenTransfer(uint256 _minTokens, address _recipient) public payable {
    ethToToken(_minTokens, _recipient);
  }

  function tokenToEthSwap(uint256 _tokensSold, uint256 _minEth) public {
    uint256 tokenReserve = getReserve();
    uint256 ethBought = getAmount(
      _tokensSold,
      tokenReserve,
      address(this).balance
    );
    require(ethBought >= _minEth, "insufficient minimum output amount");
    IERC20(tokenAddress).transferFrom(msg.sender, address(this), _tokensSold);
    (bool ok, ) = msg.sender.call{value: ethBought}("");
    require(ok, "Transfer failed");
  }

  function tokenToTokenSwap(uint256 _tokensSold, uint256 _minTokenBought, address _tokenAddress) public {
    address exchangeAddress = IFactory(factoryAddress).getExchange(_tokenAddress);
    require(
      exchangeAddress != address(this) && exchangeAddress != address(0),
      "Invalid exchange address"
    );

    uint256 tokenReserve = getReserve();
    uint256 ethBought = getAmount(_tokensSold, tokenReserve, address(this).balance);

    IERC20(tokenAddress).transferFrom(msg.sender, address(this), _tokensSold);
    IExchange(exchangeAddress).ethToTokenTransfer{value: ethBought}(_minTokenBought, msg.sender);
  }
}
