/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['three'],
  experimental: {
    turbo: {
      rules: {
        '*.typeface.json': {
          loaders: ['raw-loader'],
          as: '*.js'
        }
      },
      resolveExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
    }
  }
}

module.exports = nextConfig 