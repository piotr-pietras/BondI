> building global reliability from scratch :earth_africa: :earth_americas: :earth_asia:

# BondI: Half-Anonymous & Decentralized Bond Creator For ERC20 tokens

## Table of Contents :link:

1.  [Start :computer:](#start-computer)

2.  [Intreduction :memo:](#intreduction-memo)

    2.1. [Brief concepet :wave:](#brief-concepet-wave)

3.  [Contract mechanism :factory:](#contract-mechanism-factory)

    3.1. [Peaceful resolve :rocket:](#peaceful-resolve-rocket)

    3.2. [Force resolve :x:](#force-resolve-x)

    3.3. [Phases :repeat:](#phases-repeat)

4.  [To do :seedling:](#to-do-seedling)

    4.1. [BondI token :cookie:](#bondi-token-cookie)

    4.2. [Website :newspaper:](#website-newspaper)

## Start :computer:

In order to install modules type `make build`. To run Ganache dev blockchain type `make run`. Test bond's issue, peaceful resolve and force resolve are run by `make test` command.

## Intreduction :memo:

### Brief concepet :wave:

A: Concept was born as need to make `DeFi lending` more flexible. At this moment required security highly exceeds value of borrowed utility.

<br  />Q: How to make it more flexible :question:

A: DeFi's lending contracts have common feature. As a anonymous & undisputed mediator it has to exclude any risk from investor. Revealing anonymous issuer as a public entity gives opportunity to include social credibility as a additional security besides locked coins/tokens.

<br  />Q: What is social credibility :question:

A: It's what makes governments, institutions or companies able to sell bonds even though their potential default would couse investors to loss every penny. Well documented history, recognizability and trust are nowadays a heart of current capital flow.

<br  />Q: How to gain it :question:

A: As any world wide recognizable entities (Coca&Cola, USA etc..) gained it through history. By being reliable and paying debts.

<br  />Q: Why blockchain :question:

A: Enormous & anonymous capital from any part of world without any brokers or restrictions.

<br  />Q: Why BondI :question:

A: BondI aims to by fully decentralized and autonomous place for anyone to create bond. It collects every transaction and provide it publicly. Quantity of `eth` securing a bond is going to be drived by investor's sentiment and social credibility gradually achieved by issuers. 

> "free market is synonym of freedom :fist:"

## Contract mechanism :factory:

### Phases :repeat:

Three phases define life of bond. First one **Offering phase** begins when bond is created by issuer and last until certain number of blockes defined by `offeringBlocks` have passed. However issuer can shorten **Offering phase** by collecting capital earlier. Second one is **Usage phase** that begins at end of **Offering phase** and lasts until bond is peacfully resolved by issuer. However if issuer would not resolve bond in **Offering phase** and certain number of blocks defined by `expireBlocks` have passed bond is treated as forced resolved. At last there is **Expiration phase** which is considered as end of bond's life when investor can retrive their tokens with yield.

```mermaid
sequenceDiagram
    participant CB as Create Bond
    participant BB as Buy Bond
    participant CC as Collect Capital
    participant PR as Peaceful Resolve
    participant SB as Sell Bond
    CB-->BB: ...
    rect rgb(67, 82, 51)
    CB->>CC: Offering phase
    CB-->>CC: [ offeringBlocks ]
    end
    rect rgb(52, 43, 54)
    CC->>PR: Usage phase
    end
    rect rgb(43, 53, 54)
    rect rgb(54, 53, 43)
    PR->>SB: Expiration phase
    end
    CB-->>PR: [ expireBlocks ]
    end
```

### Peaceful resolve :rocket:

Issuer is obligated to give back borrowed ERC20 tokens before expiration phase which was defined by **expireBlocks** argument. In order to do that issuer must set ERC20 allowance for spender which is BondI smart contract, then call function **peacefulResolves**. This action ends _usage phase_ and puts bond into _expiration phase_ when investors can retrieve borrowed tokens with yield by calling function **sellBond**.

```mermaid
flowchart TB
subgraph issuance
B(lockETH)
A(issueBond)
end
X <-.-> |receive x ERC20\n +yield| F
X{investors} <-.-> |sends x ERC20\n receive y units \nof bond| C(buyBond)
B --> C
A --> C
Y{issuer} -.-> A
Y{issuer} -.-> B
subgraph .
C --> D(collectCapital)
D --> E(resolveBond)
E --> F(sellBond)
end
F --> G(unlockETH)
Y -..-> D
Y -..-> |peaceful resolve\n before expireBlock| E
Y -..-> G
```

### Force resolve :x:

In case of issuer insolvency, bond’s buyer is allowed to ask for eth that was locked as a bond secure. This action is allowed in _expiration phase_ by calling function **sellBond**.

```mermaid
flowchart TB
subgraph issuance
B(lockETH)
A(issueBond)
end
X <-.-> |receive locked ETH| E
X{investors} <-.-> |sends x ERC20\n receive y units \nof bond| C(buyBond)
B --> C
A --> C
Y{issuer} -.-> A
Y{issuer} -.-> B
subgraph .
C --> D(collectCapital)
D --> |expiration block was mined\n issuer hasn't resolved bond| E(sellBond)
E --> F(forceResolve)
end
F --> G(blackList.push)
Y <-..-> D
Y o---o G
```

## To do :seedling:

### BondI token :cookie:

As BondI aims to be autonomous and self-sustained that is why it has to have its own economy. Concept is simple, token is distributed for bond's buyers for encouragement. Token's owner has possibility to burn it for eth collected by BondI as small trasnaction's fees. Slower growth of token's supply to inflow of fees gradually rises token's price.

### Website :newspaper:

Simple and intuitive website that lists bonds and provide entire history of transaction. Connection to metamask would allow to buy&sell bond.
