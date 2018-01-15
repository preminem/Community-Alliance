#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

function dkcl(){
        CONTAINER_IDS=$(docker ps -aq)
	echo
        if [ -z "$CONTAINER_IDS" -o "$CONTAINER_IDS" = " " ]; then
                echo "========== No containers available for deletion =========="
        else
                docker rm -f $CONTAINER_IDS
        fi
	echo
}

function dkrm(){
        DOCKER_IMAGE_IDS=$(docker images | grep "dev\|none\|test-vp\|peer[0-9]-" | awk '{print $3}')
	echo
        if [ -z "$DOCKER_IMAGE_IDS" -o "$DOCKER_IMAGE_IDS" = " " ]; then
		echo "========== No images available for deletion ==========="
        else
                docker rmi -f $DOCKER_IMAGE_IDS
        fi
	echo
}

function restartNetwork() {
	echo

        #teardown the network and clean the containers and intermediate images
	cd artifacts
	docker-compose down
	dkcl
	dkrm

	#Cleanup the material
	rm -rf /tmp/hfc-test-kvs_peerOrg* $HOME/.hfc-key-store/ /tmp/fabric-client-kvs_peerOrg*

	#Start the network
	#docker run -p 5984:5984 -d --name couchdb0 -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=password -v ~/couchdb0:/opt/couchdb/data klaemo/couchdb 
	#docker run -p 6984:5984 -d --name couchdb1 -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=password -v ~/couchdb1:/opt/couchdb/data klaemo/couchdb 
	#docker run -p 7984:5984 -d --name couchdb2 -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=password -v ~/couchdb2:/opt/couchdb/data klaemo/couchdb 
	#docker run -p 8984:5984 -d --name couchdb3 -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=password -v ~/couchdb3:/opt/couchdb/data klaemo/couchdb
	docker-compose up -d
	cd -
	echo
}

function installNodeModules() {
	echo
	if [ -d node_modules ]; then
		echo "============== node modules installed already ============="
	else
		echo "============== Installing node modules ============="
		npm install --registry=https://registry.npm.taobao.org
	fi
	echo
}


restartNetwork

installNodeModules

PORT=4000 node app
