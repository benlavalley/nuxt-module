import type { Nuxt } from '@nuxt/schema'
import { addImports, addPlugin, extendWebpackConfig } from '@nuxt/kit'
import { RESOLVED_VIRTUAL_MODULES } from '../vite/constants'
import type { VuetifyNuxtContext } from './config'
import { addVuetifyNuxtPlugins } from './vuetify-nuxt-plugins'
import { toKebabCase } from './index'

export function configureNuxt(
  configKey: string,
  nuxt: Nuxt,
  ctx: VuetifyNuxtContext,
) {
  const {
    importComposables,
    prefixComposables,
  } = ctx.moduleOptions

  const runtimeDir = ctx.resolver.resolve('./runtime')

  // transpile always vuetify and runtime folder
  nuxt.options.build.transpile.push(configKey)
  nuxt.options.build.transpile.push(runtimeDir)
  // transpile vuetify nuxt plugin
  nuxt.options.build.transpile.push(/\/vuetify-nuxt-plugin\.(client|server)\.mjs$/)
  // transpile all virtual configuration modules
  // check nuxt:imports-transform unplugin: packages/nuxt/src/imports/transform.ts
  nuxt.options.imports.transform ??= {}
  nuxt.options.imports.transform.include ??= []
  for (const virtual of RESOLVED_VIRTUAL_MODULES)
    nuxt.options.imports.transform.include.push(new RegExp(`${virtual}$`))

  nuxt.options.css ??= []

  // always add vuetify/styles
  nuxt.options.css.unshift('vuetify/styles')

  extendWebpackConfig(() => {
    throw new Error('Webpack is not supported: vuetify-nuxt-module module can only be used with Vite!')
  })

  nuxt.hook('prepare:types', ({ references }) => {
    references.push({ types: 'vuetify' })
    references.push({ types: 'vuetify-nuxt-module/custom-configuration' })
    references.push({ types: 'vuetify-nuxt-module/configuration' })
    references.push({ path: ctx.resolver.resolve(runtimeDir, 'plugins/types') })
  })

  /* nuxt.hook('components:extend', async (c) => {
    const components = await ctx.componentsPromise
    Object.keys(components).forEach((component) => {
      c.push({
        pascalName: component,
        kebabName: toKebabCase(component),
        export: component,
        filePath: 'vuetify/components',
        shortPath: 'vuetify/components',
        chunkName: toKebabCase(component),
        prefetch: false,
        preload: false,
        global: false,
        mode: 'all',
      })
    })
  }) */

  if (importComposables) {
    const composables = ['useDate', 'useLocale', 'useDefaults', 'useDisplay', 'useLayout', 'useRtl', 'useTheme']
    if (ctx.vuetify3_5)
      composables.push('useGoTo')

    addImports(composables.map(name => ({
      name,
      from: ctx.vuetify3_4 || name !== 'useDate' ? 'vuetify' : 'vuetify/labs/date',
      as: prefixComposables ? name.replace(/^use/, 'useV') : undefined,
      meta: { docsUrl: `https://vuetifyjs.com/en/api/${toKebabCase(name)}/` },
    })))
  }

  if (ctx.ssrClientHints.enabled) {
    addPlugin({
      src: ctx.resolver.resolve(runtimeDir, 'plugins/vuetify-client-hints.client'),
      mode: 'client',
    })
    addPlugin({
      src: ctx.resolver.resolve(runtimeDir, 'plugins/vuetify-client-hints.server'),
      mode: 'server',
    })
  }
  else {
    addPlugin({
      src: ctx.resolver.resolve(runtimeDir, 'plugins/vuetify-no-client-hints'),
    })
  }

  addPlugin({
    src: ctx.resolver.resolve(runtimeDir, 'plugins/vuetify-icons'),
  })

  if (ctx.i18n) {
    addPlugin({
      src: ctx.resolver.resolve(runtimeDir, 'plugins/vuetify-i18n'),
    })
  }

  if (nuxt.options.dev || ctx.dateAdapter) {
    if (ctx.i18n) {
      addPlugin({
        src: ctx.resolver.resolve(runtimeDir, 'plugins/vuetify-i18n-date'),
      })
    }
    else {
      addPlugin({
        src: ctx.resolver.resolve(runtimeDir, 'plugins/vuetify-date'),
      })
    }
  }

  addVuetifyNuxtPlugins(nuxt, ctx)
}
