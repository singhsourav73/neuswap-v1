const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

const toWei = (value) => ethers.parseEther(value.toString());

const fromWei = (value) => 
  ethers.formatEther(value);

describe("Exchange", function () {
  async function deployExchangeFixture() {
    const [owner, user] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Token");
    const token = await Token.deploy("NEETU", "NEU", toWei(1000000));

    const Exchange = await ethers.getContractFactory("Exchange");
    const exchange = await Exchange.deploy(await token.getAddress());

    return { owner, user, exchange, token };
  }

  async function deployExchangeWithLiquidityFixture() {
    const {owner, user, exchange, token} = await loadFixture(deployExchangeFixture);
    
    await token.approve(await exchange.getAddress(), toWei(300));
    await exchange.addLiquidity(toWei(200), { value: toWei(100) });
    return { owner, user, exchange, token };
  }

  describe("Deployments", function() {
    it("is deployed", async function() {
      const {owner, user, exchange, token} = await loadFixture(deployExchangeFixture);

      expect(await exchange.waitForDeployment()).to.equal(exchange);
      expect(await exchange.name()).to.equal("Neuswap-V1");
      expect(await exchange.symbol()).to.equal("NEU-V1");
      expect(await exchange.totalSupply()).to.equal(toWei(0));
      expect(await exchange.factoryAddress()).to.equal(owner.address);
    });
  })

  describe("addLiquidity", function() {
    describe("Empty reserve", () => {
      it("adds liquidity", async function() {
        const {owner, user, exchange, token} = await loadFixture(deployExchangeFixture);
  
        const exchangeAddress = await exchange.getAddress();
  
        await token.approve(exchangeAddress, toWei(200));
        await exchange.addLiquidity(toWei(200), { value: toWei(100) });
  
        expect(await ethers.provider.getBalance(exchangeAddress)).to.equal(toWei(100));
        expect(await exchange.getReserve()).to.equal(toWei(200));
      });

      it("mint LP tokens", async () => {
        const { owner, user, exchange, token } = await loadFixture(deployExchangeFixture);

        const exchangeAddress = await exchange.getAddress();
        await token.approve(exchangeAddress, toWei(200));
        await exchange.addLiquidity(toWei(200), { value: toWei(100) });

        expect(await exchange.balanceOf(owner.address)).to.equal(toWei(100));
        expect(await exchange.totalSupply()).to.equal(toWei(100));
      })
    });

    describe("existing reserve", () => {
      it("preserve exchange rate", async () => {
        const { owner, user, exchange, token} = await loadFixture(deployExchangeWithLiquidityFixture);

        await exchange.addLiquidity(toWei(200), { value: toWei(50) });
        const exchangeAddress = await exchange.getAddress();
        expect(await ethers.provider.getBalance(exchangeAddress)).to.equal(toWei(150));
        expect(await exchange.getReserve()).to.equal(toWei(300));
      });

      it("mint LP tokens", async () => {
        const { owner, user, exchange, token} = await loadFixture(deployExchangeWithLiquidityFixture);

        await exchange.addLiquidity(toWei(200), { value: toWei(50) });
        expect(await exchange.balanceOf(owner.address)).to.equal(toWei(150));
        expect(await exchange.totalSupply()).to.equal(toWei(150));
      });

      it("fails when not enough tokens", async () => {
        const { owner, user, exchange, token} = await loadFixture(deployExchangeWithLiquidityFixture);

        await expect(exchange.addLiquidity(toWei(50), { value: toWei(50) }))
          .to.be.revertedWith("Insufficient Token Amount");
      });
    });

    it("allows zero amounts", async function() {
      const {owner, user, exchange, token} = await loadFixture(deployExchangeFixture);

      const exchangeAddress = await exchange.getAddress();
      await token.approve(exchangeAddress, 0);
      await exchange.addLiquidity(0, { value: 0 });

      expect(await ethers.provider.getBalance(exchangeAddress)).to.equal(0);
      expect(await exchange.getReserve()).to.equal(0);
    });
  });

  describe("getPrice", () => {
    it("Returns correct price", async () => {
      const {owner, user, exchange, token} = await loadFixture(deployExchangeFixture);

      const exchangeAddress = await exchange.getAddress();
      await token.approve(exchangeAddress, toWei(2000));
      await exchange.addLiquidity(toWei(2000), { value: toWei(1000) });
  
      const tokenReserve = await exchange.getReserve();
      const etherReserve = await ethers.provider.getBalance(exchangeAddress);
  
      expect(await exchange.getPrice(etherReserve, tokenReserve))
        .to.equal(500);
      expect(await exchange.getPrice(tokenReserve, etherReserve)).to.equal(2000);
    });
  });

  describe("getTokenAndEthAmount", () => {
    it("Returns correct token amount", async () => {
      const {owner, user, exchange, token} = await loadFixture(deployExchangeFixture);

      const exchangeAddress = await exchange.getAddress();
      await token.approve(exchangeAddress, toWei(2000));
      await exchange.addLiquidity(toWei(2000), { value: toWei(1000) });

      let tokenOut = await exchange.getTokenAmount(toWei(1));
      expect(fromWei(tokenOut)).to.equal("1.998001998001998001");
    });

    it("Returns correct Ether amount", async () => {
      const {owner, user, exchange, token} = await loadFixture(deployExchangeFixture);

      const exchangeAddress = await exchange.getAddress();
      await token.approve(exchangeAddress, toWei(2000));
      await exchange.addLiquidity(toWei(2000), { value: toWei(1000) });

      let ethOut = await exchange.getEthAmount(toWei(2));
      expect(fromWei(ethOut)).to.equal("0.999000999000999");
    });
  });

  // describe("ethtoTokenSwap", () => {
  //   // this.beforeEach(async () => {
  //   //   const {owner, user, exchange, token} = await loadFixture(deployExchangeFixture);
  //   //   const exchangeAddress = await exchange.getAddress();
  //   //   await token.approve(exchangeAddress, toWei(2000));
  //   //   await exchange.addLiquidity(toWei(2000), {value: toWei(1000)});
  //   // });

  //   it("Transfers at least min amount of tokens", async () => {
  //     const {owner, user, exchange, token} = await loadFixture(deployExchangeFixture);
  //     const exchangeAddress = await exchange.getAddress();
  //     await token.approve(exchangeAddress, toWei(2000));
  //     await exchange.addLiquidity(toWei(2000), {value: toWei(1000)});

  //     const userBalanceBefore = await ethers.provider.getBalance(user.address);
  //     await exchange.connect(user).ethToTokenSwap(toWei(1.99), {value: toWei(1)});

  //     const userBalanceAfter = await ethers.provider.getBalance(user.address);
  //     // expect(fromWei(userBalanceAfter - userBalanceBefore))
  //     //   .to.equal("-1.0004877520006021");
      
  //     const userTokenBalance = await token.balanceOf(user.address);
  //     expect(fromWei(userTokenBalance)).to.equal("1.998001998001998001");

  //     const exchangeEthBalance = await ethers.provider.getBalance(exchangeAddress);
  //     expect(fromWei(exchangeEthBalance)).to.equal("1001.0");

  //     const exchangeTokenBalance = await token.balanceOf(exchangeAddress);
  //     expect(fromWei(exchangeTokenBalance)).to.equal("1998.001998001998001999");
  //   })
  // });
})