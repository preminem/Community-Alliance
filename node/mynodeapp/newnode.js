var http = require('http');
var url = require('url');
 
http.createServer(function(req, res){
   var arg = url.parse(req.url, true).query;  //方法二arg => { aa: '001', bb: '002' }
   console.log(arg.func);//返回001
   if (arg.func == "queryPost" || arg.func == "richQueryPosts" || arg.func == "getPostNum"){
      query(arg,res);
   }else if (arg.func == "addPost" || arg.func == "updatePost"){
      invoke(arg,res);
   }
   }).listen(8888);//建立服务器并监听端口
 
console.log('Server running at http://127.0.0.1:8888/');





function query(arg,res){
	'use strict';
 
var hfc = require('fabric-client');
var path = require('path');
var sdkUtils = require('fabric-client/lib/utils')
var fs = require('fs');
var options = {
    user_id: 'Admin@org2.example.com',
    msp_id:'Org2MSP',
    channel_id: 'mychannel',
    chaincode_id: 'mycc',
    network_url: 'grpcs://10.0.2.12:7051',//因为启用了TLS，所以是grpcs,如果没有启用TLS，那么就是grpc
    privateKeyFolder: path.join(__dirname,'./crypto-config/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp/keystore'),
    signedCert: path.join(__dirname,'./crypto-config/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp/signcerts/Admin@org2.example.com-cert.pem'),
    tls_cacerts:path.join(__dirname,'./crypto-config/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt'),
    server_hostname: "peer0.org2.example.com"
};
 
var channel = {};
var client = null;
const getKeyFilesInDir = (dir) => {
//该函数用于找到keystore目录下的私钥文件的路径
    var files = fs.readdirSync(dir)
    var keyFiles = []
    files.forEach((file_name) => {
        let filePath = path.join(dir, file_name)
        if (file_name.endsWith('_sk')) {
            keyFiles.push(filePath)
        }
    })
    return keyFiles
}
Promise.resolve().then(() => {
    console.log("Load privateKey and signedCert");
    client = new hfc();
    var    createUserOpt = {
                username: options.user_id,
                 mspid: options.msp_id,
                cryptoContent: { privateKey: getKeyFilesInDir(options.privateKeyFolder)[0],
  signedCert: options.signedCert }
        }
//以上代码指定了当前用户的私钥，证书等基本信息
return sdkUtils.newKeyValueStore({
                        path: "/tmp/fabric-client-stateStore/"
                }).then((store) => {
                        client.setStateStore(store)
                         return client.createUser(createUserOpt)
                 })
}).then((user) => {
    channel = client.newChannel(options.channel_id);
     
    let data = fs.readFileSync(options.tls_cacerts);
    let peer = client.newPeer(options.network_url,
         {
            pem: Buffer.from(data).toString(),
             'ssl-target-name-override': options.server_hostname
        }
    );
    peer.setName("peer0");
    //因为启用了TLS，所以上面的代码就是指定TLS的CA证书
    channel.addPeer(peer);
    return;
}).then(() => {
    console.log("Make query");
    var transaction_id = client.newTransactionID();
    console.log("Assigning transaction_id: ", transaction_id._transaction_id);
//构造查询request参数
   if(arg.func=="queryPost"){
     const request = {
        chaincodeId: options.chaincode_id,
        txId: transaction_id,
        fcn: 'queryPost',
        args: ["POST"+arg.id]
    };
   }else if(arg.func=="richQueryPosts"){
     const request = {
        chaincodeId: options.chaincode_id,
        txId: transaction_id,
        fcn: 'richQueryPosts',
        args: [arg.attribute,arg.operator,arg.value]
    };
   }else if(arg.func=="getPostNum"){
     const request = {
        chaincodeId: options.chaincode_id,
        txId: transaction_id,
        fcn: 'getPostNum',
        args: [arg.attribute,arg.operator,arg.value]
    };
   }
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
    console.log("Response is ", query_responses[0].toString());//打印返回的结果
}).catch((err) => {
    console.error("Caught Error", err);
});
}






function invoke(arg,res){
	'use strict';
 
var hfc = require('fabric-client');
var path = require('path');
var util = require('util');
var sdkUtils = require('fabric-client/lib/utils')
const fs = require('fs');
var options = {
    user_id: 'Admin@org2.example.com',
     msp_id:'Org2MSP',
    channel_id: 'mychannel',
    chaincode_id: 'mycc',
    peer_url: 'grpcs://10.0.2.12:7051',//因为启用了TLS，所以是grpcs,如果没有启用TLS，那么就是grpc
    event_url: 'grpcs://10.0.2.12:7053',//因为启用了TLS，所以是grpcs,如果没有启用TLS，那么就是grpc
    orderer_url: 'grpcs://10.0.2.10:7050',//因为启用了TLS，所以是grpcs,如果没有启用TLS，那么就是grpc
    privateKeyFolder: path.join(__dirname,'./crypto-config/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp/keystore'),
    signedCert:path.join(__dirname,'./crypto-config/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp/signcerts/Admin@org2.example.com-cert.pem'),
    peer_tls_cacerts: path.join(__dirname,'./crypto-config/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt'),
    orderer_tls_cacerts:path.join(__dirname,'./crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt'),
    server_hostname: "peer0.org2.example.com"
};
 
var channel = {};
var client = null;
var targets = [];
var tx_id = null;
const getKeyFilesInDir = (dir) => {
//该函数用于找到keystore目录下的私钥文件的路径
        const files = fs.readdirSync(dir)
        const keyFiles = []
        files.forEach((file_name) => {
                let filePath = path.join(dir, file_name)
                if (file_name.endsWith('_sk')) {
                        keyFiles.push(filePath)
                }
        })
        return keyFiles
}
Promise.resolve().then(() => {
    console.log("Load privateKey and signedCert");
    client = new hfc();
    var    createUserOpt = {
                username: options.user_id,
                mspid: options.msp_id,
                cryptoContent: { privateKey: getKeyFilesInDir(options.privateKeyFolder)[0],
  signedCert: options.signedCert }
         }
//以上代码指定了当前用户的私钥，证书等基本信息
return sdkUtils.newKeyValueStore({
                        path: "/tmp/fabric-client-stateStore/"
                }).then((store) => {
                        client.setStateStore(store)
                        return client.createUser(createUserOpt)
                })
}).then((user) => {
    channel = client.newChannel(options.channel_id);
    let data = fs.readFileSync(options.peer_tls_cacerts);
    let peer = client.newPeer(options.peer_url,
        {
            pem: Buffer.from(data).toString(),
            'ssl-target-name-override': options.server_hostname
        }
    );
    //因为启用了TLS，所以上面的代码就是指定Peer的TLS的CA证书
    channel.addPeer(peer);
    //接下来连接Orderer的时候也启用了TLS，也是同样的处理方法
    let odata = fs.readFileSync(options.orderer_tls_cacerts);
    let caroots = Buffer.from(odata).toString();
    var orderer = client.newOrderer(options.orderer_url, {
        'pem': caroots,
        'ssl-target-name-override': "orderer.example.com"
    });
     
    channel.addOrderer(orderer);
    targets.push(peer);
    return;
}).then(() => {
    tx_id = client.newTransactionID();
    console.log("Assigning transaction_id: ", tx_id._transaction_id);
   if(arg.func=="addPost"){
     var request = {
        targets: targets,
        chaincodeId: options.chaincode_id,
        fcn: 'addPost',
        args: [arg.originalwebsite,arg.originalid,arg.title,arg.content,arg.authorid,arg.publishtime,arg.updatetime,arg.category,arg.sourceid,arg.labels,arg.follower_num,arg.browse_num,arg.star_num],
        chainId: options.channel_id,
        txId: tx_id
    };
   }else if(arg.func=="updatePost"){
    var request = {
        targets: targets,
        chaincodeId: options.chaincode_id,
        fcn: 'updatePost',
        args: [arg.id,arg.originalwebsite,arg.originalid,arg.title,arg.content,arg.authorid,arg.publishtime,arg.updatetime,arg.category,arg.sourceid,arg.labels,arg.follower_num,arg.browse_num,arg.star_num],
        chainId: options.channel_id,
        txId: tx_id
    };
   }
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
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end(proposalResponses[0].response.payload.toString());
        var request = {
            proposalResponses: proposalResponses,
             proposal: proposal,
            header: header
        };
         // set the transaction listener and set a timeout of 30sec
        // if the transaction did not get committed within the timeout period,
        // fail the test
        var transactionID = tx_id.getTransactionID();
        var eventPromises = [];
        let eh = client.newEventHub();
        //接下来设置EventHub，用于监听Transaction是否成功写入，这里也是启用了TLS
        let data = fs.readFileSync(options.peer_tls_cacerts);
        let grpcOpts = {
             pem: Buffer.from(data).toString(),
            'ssl-target-name-override': options.server_hostname
        }
        eh.setPeerAddr(options.event_url,grpcOpts);
        eh.connect();
 
        let txPromise = new Promise((resolve, reject) => {
            let handle = setTimeout(() => {
                eh.disconnect();
                reject();
            }, 30000);
//向EventHub注册事件的处理办法
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
             return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call
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
        res.end("success!");
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


