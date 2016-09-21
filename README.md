# simsl

**sim**ulator**s**tream**l**ive (simsl) is a command line utility that emulates a [Caldera StreamLive]() API server, but locally. Use it to quickly develop your service without requiring a real server or domain name. It is ideally used in conjunction with the [StreamLive SDK](https://github.com/CalderaGraphics/streamlive-sdk-js).

You need to have node.js and npm installed on your machine. To install simsl, run

```
npm install -g simsl
```

## Starting the emulator

Start a session by running the `simsl` command anywhere. The emulator will create a configuration file for itself wherever you are running the command, named `simsl.json`. You can change the name of the file by providing it as an argument to the command, like `simsl my-configuration.json`.

You can alter the configuration file while the emulator is running and it will pick up the changes on the fly.

Once started, press enter to fire a new request or type `exit` to stop the emulator.

## Emulating requests

The configuration file has a value named `webhook`; change this to match the URL that you use in your service. If for example your service is running on `localhost:4000` and the route for StreamLive requests is `/submit`, set `webhook` to `http://localhost:4000/submit`.

The content of the request is structured exactly like one from the StreamLive API server. This means that by default, you will only receive two fields: `_id` and `_token`.

`_id` is normally a form ID, but with simsl it is completely made up. The `_token` field is an actual [JWT](https://jwt.io/), albeit it won't work on production servers. You can use it to verify incoming requests by verifying the token against the [certificate](https://github.com/CalderaGraphics/simsl/blob/master/simsl.crt) that is provided with simsl.

Next, you'll want to emulate the tags that your service expects to receive. This is easily done by providing them as an array in the `tags` field of the configuration file, for example `"tags": ["first-tag", "second-tag"]`.

## Advanced tags

By default, the values of your tags will be random phrases. You can specify the type of data you want to receive for each tag by slightly altering the format:

```
"tags": {
	"first-tag": "integer",
	"second-tag": "date"
}
```

As you can see, the *key* is the tag name, and the *value* is a value type. The following types are supported:

- `string`
- `integer`
- `float`
- `bool`
- `date`
- `file`

You can also define exactly what value you want, as long as it's not one of the reserved keywords. So the following configuration:

```
"tags": {
	"first-tag": "My first tag value",
	"second-tag": false
}
```

would send requests with the two tags set to the exact values `"My first tag value"` and `false`.

As you may be aware, a tag can be used on several fields; when this happens, you would receive the tag's values as an array. You can emulate this behavior by specifying an array for a tag value:

```
"tags": {
	"first-tag": ["integer", "integer", "string"]
}
```

The values inside the array follow the same rules as described above.

## Multiple forms

By default, you will only receive one form per request. if you'd like to support multiple forms input in your service, you can change the `form_count` configuration value to the number of forms you'd like to receive.

## Echo server

The real StreamLive API server will send requests to a service webhook, but it is also capable of receiving API calls. 
While the emulator doesn't go as far as giving sensible responses to API calls, it has a simple echo server that will log every request it receives and reply with a status code 200.

By default, the emulator will run a server on `localhost:4989`. This means that you can send requests to `http://localhost:4989` and they will show up in the console. You can change the host and the port by using the `server_host` and `server_port` configuration variables.

Lastly, you can turn this echo server off entirely by setting `echo` to false in the configuration.