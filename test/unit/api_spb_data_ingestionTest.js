/**
* Copyright (c) 2022 Intel Corporation
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

var assert =  require('chai').assert,
    rewire = require('rewire');
var fileToTest = "../../api/sparkplug_data.ingestion.js";

describe(fileToTest, function() {

    process.env.OISP_KEYCLOAK_CONFIG = '{\
        "listenerPort": 4080, \
        "auth-server-url": "keycloak" \
    }';
    process.env.OISP_KAFKA_CONFIG = '{\
        "uri": "uri", \
        "partitions": 1, \
        "metricsPartitions": 1, \
        "replication": 1, \
        "timeoutMs": 10000, \
        "topicsObservations": "metricsTopic", \
        "topicsRuleEngine": "rules-update", \
        "topicsHeartbeatName": "heartbeat", \
        "topicsHeartbeatInterval": 5000, \
        "maxPayloadSize": 1234456, \
        "retries": 10, \
        "requestTimeout": 4, \
        "maxRetryTime": 10 \
    }';
    process.env.OISP_MQTT_GATEWAY_CONFIG = '{ \
        "mqttBrokerUrl": "brokerUrl", \
        "mqttBrokerLocalPort": "1234", \
        "mqttBrokerUsername": "brokerUsername", \
        "mqttBrokerPassword": "brokerPassword", \
        "authServicePort": "2345", \
        "redisConf": "@@OISP_REDIS_CONFIG", \
        "kafkaConfig": "@@OISP_KAFKA_CONFIG", \
        "postgresConfig": "@@OISP_POSTGRES_CONFIG", \
        "keycloakConfig": "@@OISP_KEYCLOAK_CONFIG", \
        "aesKey": "/app/keys/mqtt/mqtt_gw_secret.key" \
    }';

    process.env.OISP_REDIS_CONFIG = '{\
        "hostname": "redis",\
        "port": "6379",\
        "password": "password" \
    }';

    process.env.OISP_POSTGRES_CONFIG = '{\
        "dbname": "oisp",\
        "hostname": "postgres-ro",\
        "writeHostname": "postgres",\
        "port": "5432",\
        "su_username": "su_username",\
        "su_password": "su_password",\
        "username": "username",\
        "password": "password"\
    }';

    var config = {
        "mqttBrokerUrl": "brokerUrl",
        "mqttBrokerLocalPort": "1234",
        "mqttBrokerUsername": "brokerUsername",
        "mqttBrokerPassword": "brokerPassword",
        "authServicePort": "2345",
        "topics": {
            "subscribe": "topic/subscribe"
        },
        "sparkplug": {
            "spBKafkaProduce": true,
            "spBkafkaTopic": "sparkplugB",
            "ngsildKafkaProduce": false,
            "ngsildKafkaTopic": "ngsildSpB",
            "topics": {
                "subscribe": {
                    "sparkplugb_data_ingestion": "spBv1.0/+/+/+/+",
                }
            }
        },
        "cache": {
            "hostname": "redis",
            "port": "6379",
            "password": "password" 
        },
        "kafka": {
            "host": "uri",
            "partitions": 1,
            "metricsPartitions": 1,
            "replication": 1,
            "timeoutMs": 10000,
            "metricsTopic": "metricsTopic",
            "topicsRuleEngine": "rules-update",
            "topicsHeartbeatName": "heartbeat",
            "topicsHeartbeatInterval": 5000,
            "maxPayloadSize": 1234456,
            "retries": 10,
            "requestTimeout": 4,
            "maxRetryTime": 10
        },
        "postgres": {
            "dbname": "oisp",
            "hostname": "postgres-ro",
            "writeHostname": "postgres",
            "port": "5432",
            "su_username": "su_username",
            "su_password": "su_password",
            "username": "username",
            "password": "password"
        },
        "aesKey": "/app/keys/mqtt/mqtt_gw_secret.key"
    };
    var ToTest = rewire(fileToTest);

    var Kafka = function() {
        return {
            producer: function(){
                return {
                    connect: function() {
                    },
                    on: function() {
                    },
                    send: function() {
                        done();
                    },
                    events: "event"
                };
            }
        };
    };
    
    var logger = {
        error: function(){

        },
        debug: function() {

        },
        warn: function(){

        },
        info: function() {

        }
    };

    var broker = {
        bind : function(subscribeTopics){
            assert.equal(subscribeTopics,"spBv1.0/+/+/+/+","sparkplugb Topic subscribed");
            return true;
        },
        on : function(){
            return true;
        },
        unbind : function(){
            return true;
        },
        publish : function(){
            return true;
            
        },
        buildPath : function(){
            return true;
        }
    };
    class KafkaAggregator {
        start(){}
        stop(){}
        addMessage(){}
    }

    var cid = "0c574252-31d5-4b76-bce6-53f2c56b544d";
    class CacheFactory {
        constructor() {

        }
        getInstance() {
            return {
                getValue(seqKey, type) {
                    assert.equal(seqKey, "accountId/eonID", "Wrong accountId/deviceID subtopic");
                    assert.equal(type, "seq", "Wrong key value");
                    return 0;
                },
                getValues(key) {
                    assert.deepEqual(key, cid, "Wrong CID cache value received.");
                    var didAndDataType = {
                        dataType: "String",
                        on: 1,
                        dataElement:
                            {
                                "componentId": cid,
                                "on": 12345,
                                "value": "value",
                                "systemOn": 2
                            }
                    };
                    return didAndDataType;
                },
                setValue(key, type) {
                    assert.oneOf(key, ["accountId/eonID",cid], "Wrong key on cache value received.");
                    assert.oneOf(type, [ "seq", "id", "dataType" ], "Wrong type to se value received.");
                    return true;
                },
               
            };
        }
    }
    var origKafkaAggregator;
    it('Shall initialize data ingestion modules Kafka and Cache', function (done) {
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("config", config);
        origKafkaAggregator = ToTest.__get__("KafkaAggregator");
        ToTest.__set__("KafkaAggregator", KafkaAggregator);
        var spbdataIngestion = new ToTest(logger);
        assert.isObject(spbdataIngestion);
        done();
    });

    it('Validate SparkplugB Node Birth message device seq', function (done) {
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("config", config);
        ToTest.__set__("KafkaAggregator", KafkaAggregator);
        var spbdataIngestion = new ToTest(logger);
        var birthMessage = {
            timestamp: 12345,
            metrics: [{
                name : "bdseq",
                alias : cid,
                timestamp : 12345,
                dataType : "Uint64",
                value: 123
            }],
            seq: 0
         };
        spbdataIngestion.validateSpbDevSeq("spBv1.0/accountId/NBIRTH/eonID/deviceId",birthMessage)
        .then((result) => {
            assert.equal(result, true, "Invalid Seq for NBIRTH Message received");
            done();
        })
        .catch((e) => done(e));
    });

    it('Validate SparkplugB Node Birth message  wrong device seq', function (done) {
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("config", config);
        ToTest.__set__("KafkaAggregator", KafkaAggregator);
        var spbdataIngestion = new ToTest(logger);
        var birthMessage = {
            timestamp: 12345,
            metrics: [{
                name : "bdseq",
                alias : cid,
                timestamp : 12345,
                dataType : "Uint64",
                value: 123
            }],
            seq: 1
         };
        spbdataIngestion.validateSpbDevSeq("spBv1.0/accountId/NBIRTH/eonID/deviceId",birthMessage)
        .then((result) => {
            assert.equal(result, false, "Invalid Seq for BIRTH Message received");
            done();
        });
    });   

    it('Validate SparkplugB Device Birth message device seq >0', function (done) {
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("config", config);
        ToTest.__set__("KafkaAggregator", KafkaAggregator);
        var spbdataIngestion = new ToTest(logger);
        var birthMessage = {
            timestamp: 12345,
            metrics: [{
                name : "temp",
                alias : cid,
                timestamp : 12345,
                dataType : "Uint64",
                value: 123
            }],
            seq: 1
         };
        spbdataIngestion.validateSpbDevSeq("spBv1.0/accountId/DBIRTH/eonID/deviceId",birthMessage)
        .then((result) => {
            assert.equal(result, true, "Invalid Seq for BIRTH Message received");
            done();
        })
        .catch((e) => done(e));
    });

    it('Validate SparkplugB DBirth message device wrong seq i.e =0', function (done) {
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("config", config);
        ToTest.__set__("KafkaAggregator", KafkaAggregator);
        var spbdataIngestion = new ToTest(logger);
        var birthMessage = {
            timestamp: 12345,
            metrics: [{
                name : "bdseq",
                alias : cid,
                timestamp : 12345,
                dataType : "Uint64",
                value: 123
            }],
            seq: 0
         };
        spbdataIngestion.validateSpbDevSeq("spBv1.0/accountId/DBIRTH/eonID/deviceId",birthMessage)
        .then((result) => {
            assert.deepEqual(result, false, "Valid Seq for BIRTH Message received");
            done();
        })
        .catch((e) => done(e));
    });

    it('Validate SparkplugB Device Data message device seq <255', function (done) {
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("config", config);
        ToTest.__set__("KafkaAggregator", KafkaAggregator);
        var spbdataIngestion = new ToTest(logger);
        var DataMessage = {
            timestamp: 12345,
            metrics: [{
                name : "temp",
                alias : cid,
                timestamp : 12345,
                dataType : "Uint64",
                value: 123
            }],
            seq: 1
         };
        spbdataIngestion.validateSpbDevSeq("spBv1.0/accountId/DDATA/eonID/deviceId",DataMessage)
        .then((result) => {
            assert.deepEqual(result, true, "Invalid Seq for Data Message received");
            done();
        })
        .catch((e) => done(e));
    });

    it('Validate SparkplugB Device Data message wrong device seq >255', function (done) {
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("config", config);
        ToTest.__set__("KafkaAggregator", KafkaAggregator);
        var spbdataIngestion = new ToTest(logger);
        var DataMessage = {
            timestamp: 12345,
            metrics: [{
                name : "temp",
                alias : cid,
                timestamp : 12345,
                dataType : "Uint64",
                value: 123
            }],
            seq: 256
         };
        spbdataIngestion.validateSpbDevSeq("spBv1.0/accountId/DDATA/eonID/deviceId",DataMessage)
        .then((result) => {
            assert.deepEqual(result, false, "Invalid Seq for Data Message received");
            done();
        })
        .catch((e) => done(e));
    });

    it('Verify SparkplugB metric existence and get its DeviceId and dataType from cache using alias Id', function (done) {
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("config", config);
        ToTest.__set__("KafkaAggregator", KafkaAggregator);
        var spbdataIngestion = new ToTest(logger);
        var DataMessage = {
            timestamp: 12345,
            metrics: [{
                name : "temp",
                alias : cid,
                timestamp : 12345,
                dataType : "Uint64",
                value: "value"
            }],
            seq: 2
         };
         var didAndDataType = {
            dataType: "String",
            on: 1,
            dataElement:
                {
                    name : "temp",
                    alias : cid,
                    timestamp : 12345,
                    dataType : "Uint64",
                    value: "value"
                }
        };
        spbdataIngestion.getSpBDidAndDataType(DataMessage.metrics[0])
        .then((result) => {
            assert.deepEqual(result, didAndDataType, "Invalid alias ID specific to device, not in cache/DB ");
            done();
        })
        .catch((e) => done(e));
    });

    it('KafkaProduce for SparkplugB metric fails due to Invalid CID/Alias Id', function (done) {
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("config", config);
        ToTest.__set__("KafkaAggregator", KafkaAggregator);
        var spbdataIngestion = new ToTest(logger);
        var DataMessage = {
            timestamp: 12345,
            metrics: [{
                name : "temp",
                alias : "c574252-31d5-4b76-bce6-53f2c56b",
                timestamp : 12345,
                dataType : "Uint64",
                value: "value"
            }],
            seq: 2
         };
         var validateSpbDevSeq = function() {
            return Promise.resolve (true);
        };
        var errorMessage = "cid not UUID. Rejected!";
        spbdataIngestion.validateSpbDevSeq =validateSpbDevSeq; 
        spbdataIngestion.getSpBDidAndDataType(DataMessage.metrics[0])
        .then(() => {
            done();
        })
        .catch((err) => {
            assert.deepEqual(err, errorMessage, "Valid alias ID specific to device ");
            done();
        }); 
        var kafkaPubReturn= spbdataIngestion.createKafakaPubData("spBv1.0/accountId/DBIRTH/eonID/deviceId", DataMessage);
        assert.oneOf(kafkaPubReturn, [ false, undefined ], " Possible to produce kafka message for wrong alias/CID id: " + kafkaPubReturn);
        done();
    });

    it('KafkaProduce for SparkplugB metric fails due to empty sparkplugB message', function (done) {
        config.sparkplug.spBKafkaProduce = true;
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("config", config);
        ToTest.__set__("KafkaAggregator", KafkaAggregator);
        var spbdataIngestion = new ToTest(logger);
        var DataMessage = {
            timestamp: 12345,
            metrics: [],
            seq: 2
         };
         var validateSpbDevSeq = function() {
            return Promise.resolve (true);
        };
        var sendErrorOverChannel = function() {
            return true;
        };
        spbdataIngestion.validateSpbDevSeq = validateSpbDevSeq;
        spbdataIngestion.sendErrorOverChannel = sendErrorOverChannel;
         
        var kafkaPubReturn= spbdataIngestion.createKafakaPubData("spBv1.0/accountId/DBIRTH/eonID/deviceId", DataMessage);
        assert.oneOf(kafkaPubReturn, [ false, undefined ], " Possible to produce kafka message for wrong alias/CID id: " + kafkaPubReturn);
        done();
    });

    it('KafkaProduce for SparkplugB metric fails for only ngsild topic due to empty sparkplugB message', function (done) {
        config.sparkplug.spBKafkaProduce = false;
        config.sparkplug.ngsildKafkaProduce = true;
        
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("config", config);
        ToTest.__set__("KafkaAggregator", KafkaAggregator);
        var spbdataIngestion = new ToTest(logger);
        var DataMessage = {
            timestamp: 12345,
            metrics: [],
            seq: 2
         };
         var validateSpbDevSeq = function() {
            return Promise.resolve (true);
        };
        var sendErrorOverChannel = function() {
            return true;
        };
        spbdataIngestion.validateSpbDevSeq = validateSpbDevSeq;
        spbdataIngestion.sendErrorOverChannel = sendErrorOverChannel;
         
        var kafkaPubReturn= spbdataIngestion.createKafakaPubData("spBv1.0/accountId/DBIRTH/eonID/deviceId", DataMessage);
        assert.oneOf(kafkaPubReturn, [ false, undefined ], " Possible to produce kafka message for wrong alias/CID id: " + kafkaPubReturn);
        done();
    });

    it('Create Kafka  publish data on Spb topic', function (done) {
        var Kafka = function() {
            return {
                producer: function(){
                    return {
                        connect: function() {
                        },
                        on: function() {
                        },
                        send: function(payload) {
                            message = payload.messages[0];
                            assert.oneOf(message.key,["spBv1.0/accountId/NBIRTH/eonID/","spBv1.0/accountId/DBIRTH/eonID/deviceId", "spBv1.0/accountId/DDATA/eonID/deviceId" ],"Received Kafka payload key not correct");
                            var value = {
                                name : "temp",
                                alias : cid,
                                timestamp : 12345,
                                dataType : "Uint64",
                                value: "value"
                            };
                            assert.deepEqual(JSON.parse(message.value), value, "Received Kafke message not correct");
                            spbdataIngestion.stopAggregator();
                            done();
                            return new Promise(() => {});
                        },
                        events: "event"
                    };
                }
            };
        };
       
        var validateSpbDevSeq = function(){
            return Promise.resolve (true);
        };

        var getSpBDidAndDataType = function(){
            var didAndDataType = {
                dataType: "String",
                on: 1,
                dataElement:
                    {
                        name : "temp",
                        alias : cid,
                        timestamp : 12345,
                        dataType : "Uint64",
                        value: "value"
                    }
            };
            return didAndDataType;

        };
        config.sparkplug.spBKafkaProduce = true;
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("config", config);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("KafkaAggregator", origKafkaAggregator);

        var spbdataIngestion = new ToTest(logger);
        spbdataIngestion.validateSpbDevSeq =validateSpbDevSeq;
        spbdataIngestion.getSpBDidAndDataType= getSpBDidAndDataType;
        var message = {
            timestamp: 12345,
            metrics: [{
                name : "temp",
                alias : cid,
                timestamp : 12345,
                dataType : "Uint64",
                value: "value"
            }],
            seq: 0
        };   
        spbdataIngestion.processDataIngestion("spBv1.0/accountId/NBIRTH/eonID/", message);
        spbdataIngestion.processDataIngestion("spBv1.0/accountId/DBIRTH/eonID/deviceId", message);
        spbdataIngestion.processDataIngestion("spBv1.0/accountId/DDATA/eonID/deviceId", message);       
    });

    it('Create Kafka  publish data on kafka metric topic', function (done) {
        var Kafka = function() {
            return {
                producer: function(){
                    return {
                        connect: function() {
                        },
                        on: function() {
                        },
                        send: function(payload) {
                            message = payload.messages[0];
                            assert.equal(message.key, "accountId." + cid,"Received Kafka payload key not correct");
                            var value = {
                                dataType: "String",
                                aid: "accountId",
                                cid: cid,
                                value:"value",
                                systemOn:1,
                                on:1,
                                loc:null
                            };
                            assert.deepEqual(JSON.parse(message.value), value, "Received Kafke message not correct");
                            spbdataIngestion.stopAggregator();
                            done();
                            return new Promise(() => {});
                        },
                        events: "event"
                    };
                }
            };
        };
        var prepareKafkaPayload = function(){
            return {"dataType":"String", "aid":"accountId", "cid":cid, "value":"value", "systemOn": 1, "on": 1, "loc": null};
        };
        var getSpBDidAndDataType = function(){
            var didAndDataType = {
                dataType: "String",
                on: 1,
                dataElement:
                    {
                        name : "temp",
                        alias : cid,
                        timestamp : 12345,
                        dataType : "Uint64",
                        value: "value"
                    }
            };
            return didAndDataType;
        };

        config.sparkplug.spBKafkaProduce = false;
        config.sparkplug.ngsildKafkaProduce = false;
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("config", config);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("KafkaAggregator", origKafkaAggregator);

        var spbdataIngestion = new ToTest(logger);

        spbdataIngestion.prepareKafkaPayload = prepareKafkaPayload;
        
        spbdataIngestion.getSpBDidAndDataType= getSpBDidAndDataType;
        var message = {
            timestamp: 12345,
            metrics: [{
                name : "temp",
                alias : cid,
                timestamp : 12345,
                dataType : "Uint64",
                value: "value"
            }],
            seq: 0
        };    
        spbdataIngestion.createKafakaPubData("spBv1.0/accountId/DBIRTH/eonID/deviceId", message);
        spbdataIngestion.createKafakaPubData("spBv1.0/accountId/DDATA/eonID/deviceId", message);
    });

    it('Shall Kafka publish data on kafka metric topic return undefined due to mismatch of datatype', function (done) {
        var getSpBDidAndDataType = function(){
            var didAndDataType = {
                dataType: "Boolean",
                on: 1,
                dataElement:
                    {
                        name : "temp",
                        alias : cid,
                        timestamp : 12345,
                        dataType : "Boolean",
                        value: "NoTrue"
                    }
            };
            return didAndDataType;
        };

        config.sparkplug.spBKafkaProduce = false;
        config.sparkplug.ngsildKafkaProduce = false;
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("config", config);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("KafkaAggregator", KafkaAggregator);

        var spbdataIngestion = new ToTest(logger);
        spbdataIngestion.getSpBDidAndDataType= getSpBDidAndDataType;
        var message = {
            timestamp: 12345,
            metrics: [{
                name : "temp",
                alias : cid,
                timestamp : 12345,
                dataType : "Boolean",
                value: "NoTrue"
            }],
            seq: 0
        };
        var KafkaPubDataReturnNbirth = spbdataIngestion.createKafakaPubData("spBv1.0/accountId/NBIRTH/eonID", message);
        assert.deepEqual(KafkaPubDataReturnNbirth, true, "Unable to send NBIRTH Message");
        var KafkaPubDataReturnDdata = spbdataIngestion.createKafakaPubData("spBv1.0/accountId/DDATA/eonID/deviceId", message);
        assert.deepEqual(KafkaPubDataReturnDdata, undefined, "Unable to validate createkafkaPubData with wrong datatype");
        done();
    });

    it('Create Kafka  publish Relationship data on NGSI-LD Spb topic', function (done) {
        var Kafka = function() {
            return {
                producer: function(){
                    return {
                        connect: function() {
                        },
                        on: function() {
                        },
                        send: function(payload) {
                            message = payload.messages[0];
                            assert.oneOf(message.key,["spBv1.0/accountId/NBIRTH/eonID/","spBv1.0/accountId/DBIRTH/eonID/deviceId", "spBv1.0/accountId/DDATA/eonID/deviceId" ],"Received Kafka payload key not correct");
                            var value = {
                                "id" : "deviceId" + "\\" + "https://industry-fusion.com/types/v0.9/hasFilter",
                                "entityId" : "deviceId",
                                "name": "https://industry-fusion.com/types/v0.9/hasFilter",
                                "type": "https://uri.etsi.org/ngsi-ld/Relationship",
                                "https://uri.etsi.org/ngsi-ld/hasObject": "value",
                                "nodeType": "@id",
                                "index": 0
                            };
                            assert.deepEqual(JSON.parse(message.value), value, "Received Kafke message not correct");
                            spbdataIngestion.stopAggregator();
                            done();
                            return new Promise(() => {});
                        },
                        events: "event"
                    };
                }
            };
        };

        var validateSpbDevSeq = function(){
            return Promise.resolve (true);
        };

        var getSpBDidAndDataType = function(){
            var didAndDataType = {
                dataType: "String",
                on: 1,
                dataElement:
                    {
                        name : "Relationship/https://industry-fusion.com/types/v0.9/hasFilter",
                        alias : cid,
                        timestamp : 12345,
                        dataType : "string",
                        value: "value"
                    }
            };
            return Promise.resolve (didAndDataType);

        };
        config.sparkplug.spBKafkaProduce = false;
        config.sparkplug.ngsildKafkaProduce = true;
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("config", config);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("KafkaAggregator", origKafkaAggregator);

        var spbdataIngestion = new ToTest(logger);
        spbdataIngestion.validateSpbDevSeq =validateSpbDevSeq;
        spbdataIngestion.getSpBDidAndDataType= getSpBDidAndDataType;
        var message = {
            timestamp: 12345,
            metrics: [{
                name : "Relationship/https://industry-fusion.com/types/v0.9/hasFilter",
                alias : cid,
                timestamp : 12345,
                dataType : "string",
                value: "value"
            }],
            seq: 0
        };
        spbdataIngestion.processDataIngestion("spBv1.0/accountId/DBIRTH/eonID/deviceId", message);
        spbdataIngestion.processDataIngestion("spBv1.0/accountId/DDATA/eonID/deviceId", message);
    });

    it('Create Kafka  publish Properties data on NGSI-LD Spb topic', function (done) {
        var Kafka = function() {
            return {
                producer: function(){
                    return {
                        connect: function() {
                        },
                        on: function() {
                        },
                        send: function(payload) {
                            message = payload.messages[0];
                            assert.oneOf(message.key,["spBv1.0/accountId/NBIRTH/eonID/","spBv1.0/accountId/DBIRTH/eonID/deviceId", "spBv1.0/accountId/DDATA/eonID/deviceId" ],"Received Kafka payload key not correct");
                            var value = {
                                "id" : "deviceId" + "\\" + "https://industry-fusion.com/types/v0.9/hasFilter",
                                "entityId" : "deviceId",
                                "nodeType": "@value",
                                "name": "https://industry-fusion.com/types/v0.9/hasFilter",
                                "type": "https://uri.etsi.org/ngsi-ld/Property",
                                "https://uri.etsi.org/ngsi-ld/hasValue": "value",
                                "index": 0
                            };
                            assert.deepEqual(JSON.parse(message.value), value, "Received Kafke message not correct");
                            spbdataIngestion.stopAggregator();
                            done();
                            return new Promise(() => {});
                        },
                        events: "event"
                    };
                }
            };
        };
       
        var validateSpbDevSeq = function(){
            return Promise.resolve (true);
        };

        var getSpBDidAndDataType = function(){
            var didAndDataType = {
                dataType: "String",
                on: 1,
                dataElement:
                    {
                        name : "Properties/https://industry-fusion.com/types/v0.9/hasFilter",
                        alias : cid,
                        timestamp : 12345,
                        dataType : "string",
                        value: "value"
                    }
            };
            return Promise.resolve (didAndDataType);

        };
        config.sparkplug.spBKafkaProduce = true;
        config.sparkplug.ngsildKafkaProduce = true;
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("config", config);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("KafkaAggregator", origKafkaAggregator);

        var spbdataIngestion = new ToTest(logger);
        spbdataIngestion.validateSpbDevSeq =validateSpbDevSeq;
        spbdataIngestion.getSpBDidAndDataType= getSpBDidAndDataType;
        var message = {
            timestamp: 12345,
            metrics: [{
                name : "Properties/https://industry-fusion.com/types/v0.9/hasFilter",
                alias : cid,
                timestamp : 12345,
                dataType : "Uint64",
                value: "value"
            }],
            seq: 0
        };
        spbdataIngestion.processDataIngestion("spBv1.0/accountId/DBIRTH/eonID/deviceId", message);
        spbdataIngestion.processDataIngestion("spBv1.0/accountId/DDATA/eonID/deviceId", message);
    });

    it('Process data Ingestion for sparkplugB topic', function (done) {
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("config", config);
        ToTest.__set__("KafkaAggregator", KafkaAggregator);
        var spbdataIngestion = new ToTest(logger);
        var validateSpbDevSeq = function(){
            return Promise.resolve(true);
        };
        var createKafakaPubData = function(){
            return true;
        };
        spbdataIngestion.validateSpbDevSeq =validateSpbDevSeq;
        spbdataIngestion.createKafakaPubData=createKafakaPubData;

        var message = {
            timestamp: 12345,
            metrics: [{
                name : "temp",
                alias : cid,
                timestamp : 12345,
                dataType : "Uint64",
                value: "value"
            }],
            seq: 0
        };
        
        spbdataIngestion.processDataIngestion("spBv1.0/accountId/DDATA/eonID/deviceId", message);
        done();
    });

    it('Process data Ingestion for wrong SparkplugB topic', function (done) {
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("config", config);
        ToTest.__set__("KafkaAggregator", KafkaAggregator);
        var spbdataIngestion = new ToTest(logger);
        var validateSpbDevSeq = function(){
            return Promise.resolve(true);
        };
        var createKafakaPubData = function(){
            return true;
        };
        spbdataIngestion.validateSpbDevSeq =validateSpbDevSeq;
        spbdataIngestion.createKafakaPubData=createKafakaPubData;

        var message = {
            timestamp: 12345,
            metrics: [{
                name : "temp",
                alias : cid,
                timestamp : 12345,
                dataType : "Uint64",
                value: "value"
            }],
            seq: 0
        };
        let processDataIngestReturn = spbdataIngestion.processDataIngestion("spBv1.0/accountId/MATA/eonID/deviceId", message);
        assert.deepEqual(processDataIngestReturn, undefined, "Unable to validate SParkplugB schema");
        done();
    });

    it('Process data Ingestion with 2nd array component of SparkplugB Metric empty', function (done) {
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("config", config);
        ToTest.__set__("KafkaAggregator", KafkaAggregator);
        var spbdataIngestion = new ToTest(logger);
        var validateSpbDevSeq = function(){
            return Promise.resolve(true);
        };
        var createKafakaPubData = function(){
            return true;
        };
        spbdataIngestion.validateSpbDevSeq =validateSpbDevSeq;
        spbdataIngestion.createKafakaPubData=createKafakaPubData;

        var message = {
            timestamp: 12345,
            metrics: [
                {
                    name : "temp",
                    alias : cid,
                    timestamp : 12345,
                    dataType : "Uint64",
                    value: "value"
                },{}],
            seq: 0
        };
        let processDataIngestReturn = spbdataIngestion.processDataIngestion("spBv1.0/accountId/DDATA/eonID/deviceId", message);
        assert.deepEqual(processDataIngestReturn, undefined, "Unable to validate SParkplugB schema");
        done();
    });

    it('Process data Ingestion with wrong type for SparkplugB Metric', function (done) {
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("config", config);
        ToTest.__set__("KafkaAggregator", KafkaAggregator);
        var spbdataIngestion = new ToTest(logger);
        var validateSpbDevSeq = function(){
            return Promise.resolve(true);
        };
        var createKafakaPubData = function(){
            return true;
        };
        spbdataIngestion.validateSpbDevSeq =validateSpbDevSeq;
        spbdataIngestion.createKafakaPubData=createKafakaPubData;

        var message = {
            timestamp: 12345,
            metrics: [
                {
                    name : 345,
                    alias : cid,
                    timestamp : 12345,
                    dataType : "Uint64",
                    value: "value"
                }],
            seq: 0
        };
        let processDataIngestReturn = spbdataIngestion.processDataIngestion("spBv1.0/accountId/DDATA/eonID/deviceId", message);
        assert.deepEqual(processDataIngestReturn, undefined, "Unable to validate SParkplugB schema");
        done();
    });

    it('Process data Ingestion with wrong format SparkplugB Metric', function (done) {
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("config", config);
        ToTest.__set__("KafkaAggregator", KafkaAggregator);
        var spbdataIngestion = new ToTest(logger);
        var validateSpbDevSeq = function(){
            return Promise.resolve(true);
        };
        var createKafakaPubData = function(){
            return true;
        };
        spbdataIngestion.validateSpbDevSeq =validateSpbDevSeq;
        spbdataIngestion.createKafakaPubData=createKafakaPubData;

        var message = {
            timestamp: 12345,
            metrics: [{}],
            seq: 0
        };
        let processDataIngestReturn = spbdataIngestion.processDataIngestion("spBv1.0/accountId/DDATA/eonID/deviceId", message);
        assert.deepEqual(processDataIngestReturn, undefined, "Unable to validate SParkplugB schema");
        done();
    });
    it('Process data Ingestion with missing metric in SparkplugB payload', function (done) {
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("config", config);
        ToTest.__set__("KafkaAggregator", KafkaAggregator);
        var spbdataIngestion = new ToTest(logger);
        var validateSpbDevSeq = function(){
            return Promise.resolve(true);
        };
        var createKafakaPubData = function(){
            return true;
        };
        spbdataIngestion.validateSpbDevSeq =validateSpbDevSeq;
        spbdataIngestion.createKafakaPubData=createKafakaPubData;

        var message = {
            timestamp: 12345,
            seq: 0
        };
        let processDataIngestReturn = spbdataIngestion.processDataIngestion("spBv1.0/accountId/DDATA/eonID/deviceId", message);
        assert.deepEqual(processDataIngestReturn, undefined, "Unable to validate SParkplugB schema");
        done();
    });

    it('Validate data types', function (done) {
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("config", config);

        var validate = ToTest.__get__("validate");
        assert.isTrue(validate("string", "String"), "Error in Validation");
        assert.isTrue(validate("1.23", "Number"), "Error in Validation");
        assert.isTrue(validate("1", "Boolean"), "Error in Validation");
        done();
    });
    it('Normalize Boolean', function (done) {
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("config", config);

        var normalizeBoolean = ToTest.__get__("normalizeBoolean");
        assert.equal(normalizeBoolean("true", "Boolean"), 1, "Error in Validation");
        assert.equal(normalizeBoolean("0", "Boolean"), 0, "Error in Validation");
        assert.equal(normalizeBoolean("fAlse", "Boolean"), 0, "Error in Validation");
        assert.equal(normalizeBoolean(true, "Boolean"), 1, "Error in Validation");
        assert.equal(normalizeBoolean(1, "Boolean"), 1, "Error in Validation");
        assert.equal(normalizeBoolean("falsetrue", "Boolean"), "NaB", "Error in Validation");
        assert.equal(normalizeBoolean(2, "Boolean"), "NaB", "Error in Validation");
        done();
    });
    
    it('Shall check mqtt bind to topic', function (done) {
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("config", config);
        ToTest.__set__("KafkaAggregator", KafkaAggregator);
       // ToTest.__set__("broker", broker);
        var spbdataIngestion = new ToTest(logger);
        
        spbdataIngestion.bind(broker);
        done();
    });

    it('Shall prepare Kafka payload for kafka topic', function (done) {
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("config", config);
        ToTest.__set__("KafkaAggregator", KafkaAggregator);
        var spbdataIngestion = new ToTest(logger);
        var didAndDataType = {
            dataType: "String",
            on: 1,
            dataElement:
                {
                    "alias": cid,
                    "on": 1,
                    "value": "value",
                    "timestamp": 1
                }
        };
    
        var msg = spbdataIngestion.prepareKafkaPayload(didAndDataType, "accountId");
        var expectedMsg = {
            dataType: "String",
            aid: "accountId",
            value: "value",
            cid: cid,
            on: 1,
            systemOn: 1
        };
        assert.deepEqual(msg, expectedMsg, "Wrong kafka payload");
        done();
    });

    it('Shall prepare Kafka payload for kafka topic with loc and attributes', function (done) {
        ToTest.__set__("Kafka", Kafka);
        ToTest.__set__("CacheFactory", CacheFactory);
        ToTest.__set__("config", config);
        ToTest.__set__("KafkaAggregator", KafkaAggregator);
        var spbdataIngestion = new ToTest(logger);
        var didAndDataType = {
            dataType: "String",
            on: 1,
            dataElement:
                {
                    "alias": cid,
                    "on": 1,
                    "value": "value",
                    "timestamp": 1,
                    "attributes": {
                        hardware_model : "linux" 
                    },
                    loc : {
                        lat : 88,
                        long : 64
                    }
                }
        };
    
        var msg = spbdataIngestion.prepareKafkaPayload(didAndDataType, "accountId");
        var expectedMsg = {
            dataType: "String",
            aid: "accountId",
            value: "value",
            cid: cid,
            on: 1,
            systemOn: 1,
            attributes: {
                hardware_model : "linux" 
            },
            loc : {
                lat : 88,
                long : 64
            }   
        };
        assert.deepEqual(msg, expectedMsg, "Wrong kafka payload");
        done();
    });
});
