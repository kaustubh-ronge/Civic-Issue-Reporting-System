import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const updated = await prisma.report.updateMany({
        where: { status: { not: "REJECTED" } },
        data: { lastWeatherScan: null }
    })
    console.log(`Updated ${updated.count} reports to be eligible for scanning!`)
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
