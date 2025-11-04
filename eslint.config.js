import vuetify from 'eslint-config-vuetify'

export default vuetify({
  ignores: ['dist', 'dev-dist', 'node_modules'],
  rules: {
    'vue/block-lang': 'off',
    'complexity': 'off',
  },
})
