#Variables
accounts = 10
host = 127.0.0.1
port = 7545
gasPrice = 0

install:
	npm install

tests:
	truffle test

run:
	ganache-cli -a $(accounts) -p $(port) -g $(gasPrice)
