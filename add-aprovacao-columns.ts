import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding dataAprovacao and aprovadoPor columns to Process table...')
  
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "public"."Process" 
      ADD COLUMN "dataAprovacao" TIMESTAMP(3),
      ADD COLUMN "aprovadoPor" TEXT;
    `)
    console.log('Successfully added the columns')
  } catch (error) {
    if (error.message && error.message.includes('already exists')) {
      console.log('Columns already exist.')
    } else {
      console.error('Error adding columns:', error)
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
