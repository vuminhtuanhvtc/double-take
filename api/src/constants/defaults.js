module.exports = {
  telemetry: false,
  auth: false,
  token: {
    image: '24h',
  },
  detect: {
    match: {
      save: true,
      base64: false,
      confidence: 60,
      purge: 168,
      min_area: 10000,
    },
    unknown: {
      save: true,
      base64: false,
      confidence: 40,
      purge: 8,
      min_area: 0,
    },
  },
  time: { timezone: 'UTC' },
  frigate: {
    attempts: { latest: 10, snapshot: 10, mqtt: true, delay: 0 },
    image: { height: 500 },
    labels: ['person'],
    update_sub_labels: false,
    stop_on_match: true,
    min_area: 0,
    device_tracker_timeout: 30,
    cameras: [],
  },
  mqtt: {
    protocol: 'mqtt',
    port: -1,
    tls: {},
    topics: {
      frigate: 'frigate/events',
      matches: 'double-take/matches',
      cameras: 'double-take/cameras',
      homeassistant: 'homeassistant',
    },
  },
  opencv: {
    scale_factor: 1.05,
    min_neighbors: 4.5,
    min_size_width: 30,
    min_size_height: 30,
  },
  detectors: {
    compreface: {
      det_prob_threshold: 0.8,
      timeout: 15,
      opencv_face_required: false,
    },
    deepstack: {
      timeout: 15,
      opencv_face_required: false,
    },
    aiserver: {
      timeout: 15,
      opencv_face_required: false,
    },
    facebox: {
      timeout: 15,
      opencv_face_required: false,
    },
    rekognition: {
      collection_id: 'double-take',
      opencv_face_required: true,
    },
    handgesture: {
      timeout: 15,
      opencv_face_required: false,
    },
  },
  notify: {
    only_unknown: false,
    types: ['snapshot', 'latest', 'mqtt', 'frigate', 'manual'],
    gotify: {
      priority: 10,
    },
    telegram: {
      priority: 5,
    },
  },
  logs: {
    level: 'info',
    sql: false,
  },
  ui: {
    path: '',
    theme: 'bootstrap4-dark-blue',
    editor: {
      theme: 'nord_dark',
    },
    logs: {
      lines: 500,
    },
    pagination: {
      limit: 50,
    },
    thumbnails: {
      quality: 95,
      width: 500,
    },
  },
  server: {
    port: 3000,
  },
};
