const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const actions = require('./actions');
const { DETECTORS } = require('../../constants')();
const config = require('../../constants/config');

const { HANDGESTURE } = DETECTORS || {};

module.exports.recognize = async ({ key }) => {
  const { URL } = HANDGESTURE;
  const formData = new FormData();
  formData.append('image', fs.createReadStream(key));
  
  return axios({
    method: 'post',
    timeout: HANDGESTURE.TIMEOUT * 1000,
    headers: formData.getHeaders(),
    url: `${URL}/v1/gesture/recognize`,
    data: formData,
    validateStatus: () => true,
  });
};

module.exports.normalize = ({ camera, data }) => {
  if (!data.success) {
    console.warn('Unexpected hand gesture response');
    return [];
  }
  
  const { MATCH, UNKNOWN } = config.detect(camera);
  const normalized = data.predictions.map((gesture) => {
    const confidence = parseFloat((gesture.confidence * 100).toFixed(2));
    const output = {
      name: confidence >= UNKNOWN.CONFIDENCE ? gesture.gesture_name.toLowerCase() : 'unknown',
      confidence,
      match: confidence >= MATCH.CONFIDENCE,
      box: {
        top: gesture.y_min,
        left: gesture.x_min,
        width: gesture.x_max - gesture.x_min,
        height: gesture.y_max - gesture.y_min,
      },
    };
    const checks = actions.checks({ MATCH, UNKNOWN, ...output });
    if (checks.length) output.checks = checks;
    return checks !== false ? output : [];
  });
  return normalized;
};
