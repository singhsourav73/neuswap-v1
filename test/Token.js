const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Token", function () {
  async function deployTokenFixture() {
    const [owner] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Token");
    const token = await Token.deploy("NEETU", "NEU", 100000);

    return { owner, token };
  }

  describe("Deployments", function () {
    it("Sets name and symbol when created", async function () {
      const { owner, token } = await loadFixture(deployTokenFixture);

      expect(await token.name()).to.equal("NEETU");
      expect(await token.symbol()).to.equal("NEU");
    });

    it("mint initialSupply to msg.sender when created", async function() {
      const { owner, token } = await loadFixture(deployTokenFixture);

      expect(await token.totalSupply()).to.equal(100000);
      expect(await token.balanceOf(owner.address)).to.equal(100000);
    })
  });
});