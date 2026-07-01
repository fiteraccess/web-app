.PHONY: run test build format

run:
	ng serve --proxy-config proxy.localhost.conf.js --host 0.0.0.0 --allowed-hosts=.all

test:
	npm test

build:
	npm run build

format:
	npx prettier . --write --ignore-unknown



kill:
	lsof -ti :4200 | xargs kill -9
