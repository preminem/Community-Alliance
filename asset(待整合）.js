var http = require('http');
var url = require('url');
 
http.createServer(function(req, res){
   var arg = url.parse(req.url, true).query;  //方法二arg => { aa: '001', bb: '002' }
   console.log(arg.func);//返回001
   if (arg.func == "queryAllTransaction"){
      query(arg,res);
   }else if (arg.func == "StartTransaction"){
      invoke(arg,res);
   }
   }).listen(8888);//建立服务器并监听端口
 
console.log('Server running at http://127.0.0.1:8888/');



function query(arg,res){
	'use strict';

var hfc = require('fabric-client');
var path = require('path');

var options = {
    wallet_path: path.join(__dirname, './creds'),
    user_id: 'PeerAdmin',
    channel_id: 'mychannel',
    chaincode_id: 'fabcar',
    network_url: 'grpc://localhost:7051',
};

var channel = {};
var client = null;

Promise.resolve().then(() => {
    console.log("Create a client and set the wallet location");
    client = new hfc();
    return hfc.newDefaultKeyValueStore({ path: options.wallet_path });
}).then((wallet) => {
    console.log("Set wallet path, and associate user ", options.user_id, " with application");
    client.setStateStore(wallet);
    return client.getUserContext(options.user_id, true);
}).then((user) => {
    console.log("Check user is enrolled, and set a query URL in the network");
    if (user === undefined || user.isEnrolled() === false) {
        console.error("User not defined, or not enrolled - error");
    }
    channel = client.newChannel(options.channel_id);
    channel.addPeer(client.newPeer(options.network_url));
    return;
}).then(() => {
    console.log("Make query");
    var transaction_id = client.newTransactionID();
    console.log("Assigning transaction_id: ", transaction_id._transaction_id);

    
    const request = {
        chaincodeId: options.chaincode_id,
        txId: transaction_id,
        fcn: arg.func,
        args: []
    };
    return channel.queryByChaincode(request);
}).then((query_responses) => {
    console.log("returned from query");
    if (!query_responses.length) {
        console.log("No payloads were returned from query");
    } else {
        console.log("Query result count = ", query_responses.length)
    }
    if (query_responses[0] instanceof Error) {
        console.error("error from query = ", query_responses[0]);
    }
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end(query_responses[0]);
    console.log("Response is ", query_responses[0].toString());
}).catch((err) => {
    console.error("Caught Error", err);
});
}


function invoke(arg,res){
	'use strict';

var hfc = require('fabric-client');
var path = require('path');
var util = require('util');
const asn1 = require('asn1.js');
var fs = require('fs');
var http = require('http');
var querystring = require('querystring');
var crypto = require('crypto')


//开始查找帖子信息
var data = querystring.stringify({
    func: 'queryPost',
     id: arg.id
});
var options = {
    hostname: '101.201.211.174',
        port: 8888,
        path: '/select?' + data,
      method: 'GET'
};

var data;
//发送请求
var req = http.request(options,function(res){
    res.setEncoding('utf8');
    res.on('data',function(chunk){
        var returnData = JSON.parse(chunk);//如果服务器传来的是json字符串，可以将字符串转换成json
        console.log(returnData);
        data = returnData;

    });
});
//如果有错误会输出错误
req.on('error', function(e){
     console.log('错误：' + e.message);
});
req.end();
//查找帖子结束，开始加密
var keypub = { 
    privateKey: path.join(__dirname,'./creds/5890f0061619c06fb29dea8cb304edecc020fe63f41a6db109f1e227cc1cb2a8-priv'), 
    certificate: path.join(__dirname,'./creds/zhengshu'), 
};


var cryptoContent = {
   privateKey: keypub.privateKey,
   certificate: keypub.certificate,
};

var privatePem = fs.readFileSync(cryptoContent.privateKey);
var certificatePem = fs.readFileSync(cryptoContent.certificate);
var key = privatePem.toString();
var cer = certificatePem.toString();
console.log(key);   //打印秘钥
console.log(cer);

// 给帖子做哈希
var datastring = JSON.stringify(data);
 var sha256 = crypto.createHash('sha256');
 sha256.update(datastring);
 var copyright = sha256.digest('hex');
//生成tx_id
var unhash_tx_id = {"tx_id": "", 
     "copyright": copyright,
     "version": "1.0",
     "tx_in_count": 1,
     "tx_out_count": 2,
     "in":[{"hash":"Admin@org1.example.com","index":0,"scriptsig_r":"","scriptsig_s":""}],
     "out":[{"value":10,"certificate":"abcd"},{"value":999990,"certificate":cer}]
    };
var string = JSON.stringify(unhash_tx_id);
 var sha256 = crypto.createHash('sha256');
 sha256.update(string);
 var txid = sha256.digest('hex');
 //做签名
 const EcdsaDerSig = asn1.define('ECPrivateKey', function() {
    return this.seq().obj(
        this.key('r').int(),
        this.key('s').int()
    );
});

var sign = crypto.createSign('SHA256');
var scriptstring = util.format("{\"tx_id\":%s,\"certificate\":%s}",txid,cer)

console.log(scriptstring);
sign.update(scriptstring);
var sig = sign.sign(key, 'buffer');
const rsSig = EcdsaDerSig.decode(sig, 'der');
console.log(rsSig.r.toString());
console.log(rsSig.s.toString());
//生成最终交易结构
var endtransaction = {"tx_id": txid, 
     "copyright": copyright,
     "version": "1.0",
     "tx_in_count": 1,
     "tx_out_count": 2,
     "in":[{"hash":"Admin@org1.example.com","index":0,"scriptsig_r":rsSig.r.toString(),"scriptsig_s":rsSig.s.toString()}],
     "out":[{"value":10,"certificate":"abcd"},{"value":999990,"certificate":cer}]
    };
var transactionstring = JSON.stringify(endtransaction);
console.log(transactionstring);

var options = {
    wallet_path: path.join(__dirname, './creds'),
    user_id: 'PeerAdmin',
    channel_id: 'mychannel',
    chaincode_id: 'fabcar',
    peer_url: 'grpc://localhost:7051',
    event_url: 'grpc://localhost:7053',
    orderer_url: 'grpc://localhost:7050'
};

var channel = {};
var client = null;
var targets = [];
var tx_id = null;
Promise.resolve().then(() => {
    console.log("Create a client and set the wallet location");
    client = new hfc();
    return hfc.newDefaultKeyValueStore({ path: options.wallet_path });
}).then((wallet) => {
    console.log("Set wallet path, and associate user ", options.user_id, " with application");
    client.setStateStore(wallet);
    return client.getUserContext(options.user_id, true);
}).then((user) => {
    console.log("Check user is enrolled, and set a query URL in the network");
    if (user === undefined || user.isEnrolled() === false) {
        console.error("User not defined, or not enrolled - error");
    }
    channel = client.newChannel(options.channel_id);
    var peerObj = client.newPeer(options.peer_url);
    channel.addPeer(peerObj);
    channel.addOrderer(client.newOrderer(options.orderer_url));
    targets.push(peerObj);
    return;
}).then(() => {
    tx_id = client.newTransactionID();
    console.log("Assigning transaction_id: ", tx_id._transaction_id);
  
    var request = {
        targets: targets,
        chaincodeId: options.chaincode_id,
        fcn: 'transaction',
        args: [transactionstring],
        chainId: options.channel_id,
        txId: tx_id
    };
    return channel.sendTransactionProposal(request);
}).then((results) => {
    var proposalResponses = results[0];
    var proposal = results[1];
    var header = results[2];
    let isProposalGood = false;
    if (proposalResponses && proposalResponses[0].response &&
        proposalResponses[0].response.status === 200) {
        isProposalGood = true;
        console.log('transaction proposal was good');
    } else {
        console.error('transaction proposal was bad');
    }
    if (isProposalGood) {
        console.log(util.format(
            'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s',
            proposalResponses[0].response.status, proposalResponses[0].response.message,
            proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature));
        console.log(proposalResponses[0].response.payload.toString());
        var request = {
            proposalResponses: proposalResponses,
            proposal: proposal,
            header: header
        };
      

        var transactionID = tx_id.getTransactionID();
        var eventPromises = [];
        let eh = client.newEventHub();
        eh.setPeerAddr(options.event_url);
        eh.connect();

        let txPromise = new Promise((resolve, reject) => {
            let handle = setTimeout(() => {
                eh.disconnect();
                reject();
            }, 30000);

            eh.registerTxEvent(transactionID, (tx, code) => {
                clearTimeout(handle);
                eh.unregisterTxEvent(transactionID);
                eh.disconnect();

                if (code !== 'VALID') {
                    console.error(
                        'The transaction was invalid, code = ' + code);
                    reject();
                } else {
                    console.log(
                        'The transaction has been committed on peer ' +
                        eh._ep._endpoint.addr);
                    resolve();
                }
            });
        });
        eventPromises.push(txPromise);
        var sendPromise = channel.sendTransaction(request);
        return Promise.all([sendPromise].concat(eventPromises)).then((results) => {
            console.log(' event promise all complete and testing complete');
            return results[0]; 
        }).catch((err) => {
            console.error(
                'Failed to send transaction and get notifications within the timeout period.'
            );
            return 'Failed to send transaction and get notifications within the timeout period.';
        });
    } else {
        console.error(
            'Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...'
        );
        return 'Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...';
    }
}, (err) => {
    console.error('Failed to send proposal due to error: ' + err.stack ? err.stack :
        err);
    return 'Failed to send proposal due to error: ' + err.stack ? err.stack :
        err;
}).then((response) => {
    if (response.status === 'SUCCESS') {
    	res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(transactionstring);
        console.log('Successfully sent transaction to the orderer.');
        return tx_id.getTransactionID();
    } else {
        console.error('Failed to order the transaction. Error code: ' + response.status);
        return 'Failed to order the transaction. Error code: ' + response.status;
    }
}, (err) => {
    console.error('Failed to send transaction due to error: ' + err.stack ? err
        .stack : err);
    return 'Failed to send transaction due to error: ' + err.stack ? err.stack :
        err;
});

}

