# Loadgram 

UDP load balancer written in node.js.

## Features

- Round robin load balancing strategy
- Health check of the attached backend servers
- Configurable timeout
- A Web UI to report on the important metrics (Missing)
- A HTTP JSON API to report on the important metrics (Missing)
- Use a backend server as backup (Missing)

## Configuration

```json
{
	"global" : {
		"loglevel" : "debug" 
	},
	"admin" : {
		"port" : 4000,
		"webui" : true,
		"api" : true
	},
	"frontends" : [
		{	
			"port" : "3535",
			"strategy" : "roundrobin",
			"healthcheck" : {
				"enabled" : true,
				"interval" : 5000,
				"retries" : 3,
				"packet" : {
					"message" : "01",
					"encoding" : "hex"
				}
			},
			"backends" : [
				{
					"host" : "localhost",
					"port" : "4000",
					"backup" : false,
					"timeout" : 2000
				}
			]
		}
	]	
}
```

## License

Copyright (c) 2015 Adveez

This software is under the MIT license, see the license document in this repository for more information.