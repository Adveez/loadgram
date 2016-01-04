# Loadgram 

UDP load balancer written in node.js.

![](https://img.shields.io/badge/coverage-48%-orange.svg)

## Notice

This project is under development and should not be consider production ready. Early adopters and contributors are obviously welcome.

## Features

- Round robin load balancing strategy
- Health check of the attached backend servers
- Configurable timeout
- A Web UI to report on the important metrics
- A HTTP JSON API to report on the important metrics
- Use a backend server as backup

## Configuration file

```json
{
	"global" : {
		"loglevel" : "info" 
	},
	"admin" : {
		"port" : 4000,
		"webui" : true,
		"api" : true,
		"refreshInterval" : 2000
	},
	"frontends" : [
		{	
			"port" : 3000,
			"strategy" : "roundrobin",
			"healthcheck" : {
				"enabled" : true,
				"interval" : 10000,
				"retries" : 3,
				"packet" : {
					"message" : "01",
					"encoding" : "hex"
				}
			},
			"backends" : [
				{
					"host" : "localhost",
					"port" : 4000,
					"backup" : false,
					"timeout" : 5000
				},
				{
					"host" : "localhost",
					"port" : 4010,
					"backup" : false,
					"timeout" : 5000
				},
				{
					"host" : "localhost",
					"port" : 4020,
					"backup" : true,
					"timeout" : 5000
				}
			]
		},
		{	
			"port" : 3001,
			"strategy" : "roundrobin",
			"healthcheck" : {
				"enabled" : true,
				"interval" : 10000,
				"retries" : 3,
				"packet" : {
					"message" : "01",
					"encoding" : "hex"
				}
			},
			"backends" : [
				{
					"host" : "localhost",
					"port" : 4000,
					"backup" : false,
					"timeout" : 5000
				},
				{
					"host" : "localhost",
					"port" : 4010,
					"backup" : false,
					"timeout" : 5000
				}
			]
		}
	]	
}
```

## Run test

Requirements:

- development dependencies installed i.e `npm install`

```
npm test
```

## Run test coverage

Requirements:

- development dependencies installed i.e `npm install`
- jscoverage utility installed (https://github.com/tj/node-jscoverage) 

```
npm run test-cov
```

Open coverage.html in your browser to see the result

## License

Copyright (c) 2015-today Adveez

This software is under the MIT license, see the license document in this repository for more information.