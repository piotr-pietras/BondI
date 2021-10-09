const BondI = artifacts.require('BondI')

contract('BondI', async (accounts)=> {
    let bondI

    before(async ()=> {
        bondI = await BondI.deployed()
        await bondI.issueBond(
            'company X / 2134441-2',
            'CEO: Richard Richard, Issuer: Adam Adam',
            1,
            10000,
            2,
            1000,
            {from: accounts[1]}
        )
    })

    describe('BondI deployment', async ()=> {
        it('has a name', async ()=> {
            const name = await bondI.name()
            assert.equal(name, 'BondI')
        })

        it('has tested transaction', async ()=> {
            const result = await web3.eth.sendTransaction({
                from: accounts[1], 
                to: accounts[0],
                value: web3.utils.toWei('1', 'ether')
            })
            assert.equal(result.status, true)
        })
    })

    describe('BondI issue', async ()=> {
        const getIssuedInfo = async(value) => await bondI.bonds(accounts[1], value)
        const values = ['title', 'extra', 'price', 'amount', 'buyBack', 'blocks']

        values.map((value) => {
            it(value, async ()=> {
                const call = await getIssuedInfo(value)
                console.log(`       ${call}`)
                assert.isDefined(call)
            })   
        })
    })
  
})