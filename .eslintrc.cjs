module.exports = {
  extends: 'standard',
  rules: {
    'object-property-newline': [
      'error',
      { allowAllPropertiesOnSameLine: false }
    ],
    'semi': ['error', 'always'],
    'no-extra-semi': 'error',
    'quote-props': ['error', 'consistent-as-needed']
  }
};
