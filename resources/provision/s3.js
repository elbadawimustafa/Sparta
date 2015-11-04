// Manages an S3 buckets notification sources:
// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putBucketNotificationConfiguration-property
// http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-function-code.html
var response = require('cfn-response');
var AWS = require('aws-sdk');
console.log('AWS SDK v.' + AWS.VERSION);
exports.handler = function(event, context) {
  var responseData = {};
  try {
    var onUpdateConfigResponse = function(e, updateResponse) {
      responseData.error = e ? e.toString() : undefined;
      responseData.update = updateResponse ? updateResponse : undefined;
      response.send(event, context, e ? response.FAILED : response.SUCCESS, responseData);
    };

    var onResponse = function(e, configResponse) {
      if (e) {
        responseData.Error = e.toString();
        response.send(event, context, response.FAILED, responseData);
      } else if (event.ResourceProperties) {
        var addIDs = (event.RequestType !== 'Delete') ? [event.ResourceProperties.LambdaTarget] : [];
        var removeArns = [];
        if (event.OldResourceProperties && event.OldResourceProperties.LambdaTarget) {
          removeArns.push(event.OldResourceProperties.LambdaTarget);
        }
        if (event.RequestType === 'Delete') {
          removeArns.push(event.ResourceProperties.LambdaTarget);
        }
        var lambdas = [];
        addIDs.forEach(function() {
          lambdas.push(event.ResourceProperties.Permission);
          lambdas[lambdas.length - 1].LambdaFunctionArn = event.ResourceProperties.LambdaTarget;
        });
        (configResponse.LambdaFunctionConfigurations || []).forEach(function(eachConfig) {
          if (removeArns.indexOf(eachConfig.LambdaFunctionArn) !== -1) {
            lambdas.push(eachConfig);
          }
        });
        configResponse.LambdaFunctionConfigurations = lambdas;
        // Put it back
        var s3 = new AWS.S3();
        console.log('Bucket: ' + event.ResourceProperties.Bucket + ', Value: ' + JSON.stringify(configResponse));
        s3.putBucketNotificationConfiguration({
          Bucket: event.ResourceProperties.Bucket,
          NotificationConfiguration: configResponse
        }, onUpdateConfigResponse);
      } else {
        response.send(event, context, response.FAILED, {
          'Error': 'No ResourceProperties'
        });
      }
    };
    var s3 = new AWS.S3();
    var params = {
      Bucket: 'napidocs-log'
    };
    s3.getBucketNotificationConfiguration(params, onResponse);
  } catch (e) {
    responseData.awsLoaded = e.toString();
    response.send(event, context, response.FAILED, responseData);
  }
};