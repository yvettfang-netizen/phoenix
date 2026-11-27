import { AddressInfo } from 'node:net'
import { AppError } from '../domain/errors'
import { createAppServer } from '../http/app'
import { loadIsolatedEducationProjection } from './canonical-family-projection'
import { LearningCatalog, loadLearningCatalog } from './canonical-learning-catalog'

const host = '127.0.0.1'
const configError = () => new AppError(500, 'CANONICAL_ISOLATION_CONFIG_INVALID', '隔离环境配置无效')

export async function startIsolatedCanonicalEducation(env: NodeJS.ProcessEnv): Promise<void> {
  const port = Number(env.PORT ?? '3000')
  if (env.NODE_ENV !== 'test' || (env.LISTEN_HOST ?? host) !== host ||
      env.DATABASE_URL !== undefined || env.CANONICAL_BROKER_SESSION_BRIDGE_ENABLED === 'true' ||
      !Number.isInteger(port) || port < 0 || port > 65535 ||
      env.CANONICAL_LEARNING_CATALOG_ENABLED !== 'true' || env.CANONICAL_FAMILY_PROJECTION_ENABLED !== 'true' ||
      env.CANONICAL_FAMILY_PROJECTION_AUDITED_ENABLED !== 'true') throw configError()

  const familyProjection = await loadIsolatedEducationProjection(env)
  if (!familyProjection) throw configError()
  let catalog: LearningCatalog | undefined
  const closeAdapters = () => Promise.allSettled([familyProjection.close(), catalog?.close()])

  try {
    catalog = await loadLearningCatalog(env, familyProjection.databasePort)
    if (!catalog) throw configError()
    const learningCatalog = catalog
    const readiness = async () => {
      await learningCatalog.list()
      await familyProjection.assertEducationReady()
    }
    await readiness()
    const server = createAppServer({ isolatedCanonical: true, learningCatalog, familyProjection, readiness })
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(port, host, () => {
        server.off('error', reject)
        resolve()
      })
    })
    const address = server.address() as AddressInfo
    process.stdout.write(`Education Compass isolated Canonical runtime listening on port ${address.port}\n`)
    const shutdown = () => {
      process.off('SIGINT', shutdown)
      process.off('SIGTERM', shutdown)
      server.close(() => { void closeAdapters() })
    }
    process.once('SIGINT', shutdown)
    process.once('SIGTERM', shutdown)
  } catch (error) {
    await closeAdapters()
    throw error
  }
}
