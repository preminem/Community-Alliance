/**
 * Copyright 2017 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
'use strict';
var path = require('path');
var fs = require('fs');
var util = require('util');
var hfc = require('fabric-client');
var Peer = require('fabric-client/lib/Peer.js');
var helper = require('./helper.js');
var logger = helper.getLogger('invoke-chaincode');
var EventHub = require('fabric-client/lib/EventHub.js');
var ORGS = hfc.getConfigSetting('network-config');
const asn1 = require('asn1.js');
var crypto = require('crypto')

var copyrightTransaction = function(peerNames, channelName, chaincodeName, fcn, data, inputResult, balance, username, org) {
	logger.debug(util.format('\n============ invoke copyright transaction on organization %s ============\n', org));

var cryptoContent = helper.getKey(username,org);
var key = cryptoContent.privateKeyPEM;
var cer = cryptoContent.signedCertPEM;

// 给帖子做哈希
var datastring = JSON.stringify(data);
var sha256 = crypto.createHash('sha256');
sha256.update(datastring);
var copyright = sha256.digest('hex');
//解析input
var input = JSON.parse(inputResult)
//生成tx_id
var unhash_tx_id = {"tx_id": "", 
     "copyright": copyright,
     "version": "1.0",
     "tx_in_count": 1,
     "tx_out_count": 2,
     "in":[{"hash":input.hash,"index":input.index,"scriptsig_r":"","scriptsig_s":""}],
     "out":[{"value":10,"certificate":"abcd"},{"value":balance - 10,"certificate":cer}]
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

//生成最终交易结构
var endtransaction = {"tx_id": txid, 
     "copyright": copyright,
     "version": "1.0",
     "tx_in_count": 1,
     "tx_out_count": 2,
     "in":[{"hash":input.hash,"index":input.index,"scriptsig_r":rsSig.r.toString(),"scriptsig_s":rsSig.s.toString()}],
     "out":[{"value":10,"certificate":"abcd"},{"value":999990,"certificate":cer}]
    };
var transactionstring = JSON.stringify(endtransaction);

	var client = helper.getClientForOrg(org);
	var channel = helper.getChannelForOrg(org);
	var targets = (peerNames) ? helper.newPeers(peerNames, org) : undefined;
	var tx_id = null;

	return helper.getRegisteredUsers(username, org).then((user) => {
		tx_id = client.newTransactionID();
		logger.debug(util.format('Sending transaction "%j"', tx_id));
		// send proposal to endorser
		var request = {
			chaincodeId: chaincodeName,
			fcn: fcn,
			args: [transactionstring],
			chainId: channelName,
			txId: tx_id
		};

		if (targets)
			request.targets = targets;

		return channel.sendTransactionProposal(request);
	}, (err) => {
		logger.error('Failed to enroll user \'' + username + '\'. ' + err);
		throw new Error('Failed to enroll user \'' + username + '\'. ' + err);
	}).then((results) => {
		var proposalResponses = results[0];
		var proposal = results[1];
		var all_good = true;
		for (var i in proposalResponses) {
			let one_good = false;
			if (proposalResponses && proposalResponses[i].response &&
				proposalResponses[i].response.status === 200) {
				one_good = true;
				logger.info('transaction proposal was good');
			} else {
				logger.error('transaction proposal was bad');
			}
			all_good = all_good & one_good;
		}
		if (all_good) {
			logger.debug(util.format(
				'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s',
				proposalResponses[0].response.status, proposalResponses[0].response.message,
				proposalResponses[0].response.payload, proposalResponses[0].endorsement
				.signature));
			var request = {
				proposalResponses: proposalResponses,
				proposal: proposal
			};
			// set the transaction listener and set a timeout of 30sec
			// if the transaction did not get committed within the timeout period,
			// fail the test
			var transactionID = tx_id.getTransactionID();
			var eventPromises = [];

			if (!peerNames) {
				peerNames = channel.getPeers().map(function(peer) {
					return peer.getName();
				});
			}

			var eventhubs = helper.newEventHubs(peerNames, org);
			for (let key in eventhubs) {
				let eh = eventhubs[key];
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
							logger.error(
								'The balance transfer transaction was invalid, code = ' + code);
							reject();
						} else {
							logger.info(
								'The balance transfer transaction has been committed on peer ' +
								eh._ep._endpoint.addr);
							resolve();
						}
					});
				});
				eventPromises.push(txPromise);
			};
			var sendPromise = channel.sendTransaction(request);
			return Promise.all([sendPromise].concat(eventPromises)).then((results) => {
				logger.debug(' event promise all complete and testing complete');
				return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call
			}).catch((err) => {
				logger.error(
					'Failed to send transaction and get notifications within the timeout period.'
				);
				return 'Failed to send transaction and get notifications within the timeout period.';
			});
		} else {
			logger.error(
				'Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...'
			);
			return 'Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...';
		}
	}, (err) => {
		logger.error('Failed to send proposal due to error: ' + err.stack ? err.stack :
			err);
		return 'Failed to send proposal due to error: ' + err.stack ? err.stack :
			err;
	}).then((response) => {
		if (response.status === 'SUCCESS') {
			logger.info('Successfully sent transaction to the orderer.');
			return tx_id.getTransactionID();
		} else {
			logger.error('Failed to order the transaction. Error code: ' + response.status);
			return 'Failed to order the transaction. Error code: ' + response.status;
		}
	}, (err) => {
		logger.error('Failed to send transaction due to error: ' + err.stack ? err
			.stack : err);
		return 'Failed to send transaction due to error: ' + err.stack ? err.stack :
			err;
	});
};

exports.copyrightTransaction = copyrightTransaction;
