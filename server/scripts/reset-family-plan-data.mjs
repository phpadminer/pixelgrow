import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const familyKey = process.env.FAMILY_PLAN_FAMILY_KEY || 'demo-family'
const confirmValue = process.env.FAMILY_PLAN_RESET_CONFIRM
const resetChildren = process.env.FAMILY_PLAN_RESET_CHILDREN === 'true'
const createStarterChildren = process.env.FAMILY_PLAN_CREATE_STARTER_CHILDREN !== 'false'

const starterChildren = [
  { childKey: 'gege', childCode: 'GEGE01', pinCode: '2580', name: '哥哥', avatar: 'lamb', grade: '四年级' },
  { childKey: 'meimei', childCode: 'MEIMEI01', pinCode: '2580', name: '妹妹', avatar: 'chick', grade: '二年级' },
]

function requireConfirmation() {
  if (confirmValue === familyKey) return

  console.error([
    'Refusing to reset family plan data.',
    `Set FAMILY_PLAN_RESET_CONFIRM=${familyKey} to confirm the target family key.`,
    'Optional:',
    '  FAMILY_PLAN_RESET_CHILDREN=true              also delete child profiles before recreating starter children',
    '  FAMILY_PLAN_CREATE_STARTER_CHILDREN=false   leave child table empty',
  ].join('\n'))
  process.exit(1)
}

async function countFamilyPlanRows() {
  const [
    children,
    courses,
    habits,
    tasks,
    milestones,
    completions,
    rules,
    gifts,
    redemptions,
    pointLedger,
  ] = await Promise.all([
    prisma.familyPlanChild.count({ where: { familyKey } }),
    prisma.familyPlanCourse.count({ where: { familyKey } }),
    prisma.familyPlanHabit.count({ where: { familyKey } }),
    prisma.familyPlanTask.count({ where: { familyKey } }),
    prisma.familyPlanMilestone.count({ where: { familyKey } }),
    prisma.familyPlanCompletion.count({ where: { familyKey } }),
    prisma.familyPlanRule.count({ where: { familyKey } }),
    prisma.familyPlanGift.count({ where: { familyKey } }),
    prisma.familyPlanRedemption.count({ where: { familyKey } }),
    prisma.familyPlanPointLedger.count({ where: { familyKey } }),
  ])

  return {
    children,
    courses,
    habits,
    tasks,
    milestones,
    completions,
    rules,
    gifts,
    redemptions,
    pointLedger,
  }
}

async function resetFamilyPlanData() {
  requireConfirmation()

  const before = await countFamilyPlanRows()

  await prisma.$transaction([
    prisma.familyPlanPointLedger.deleteMany({ where: { familyKey } }),
    prisma.familyPlanRedemption.deleteMany({ where: { familyKey } }),
    prisma.familyPlanCompletion.deleteMany({ where: { familyKey } }),
    prisma.familyPlanCourse.deleteMany({ where: { familyKey } }),
    prisma.familyPlanHabit.deleteMany({ where: { familyKey } }),
    prisma.familyPlanTask.deleteMany({ where: { familyKey } }),
    prisma.familyPlanMilestone.deleteMany({ where: { familyKey } }),
    prisma.familyPlanRule.deleteMany({ where: { familyKey } }),
    prisma.familyPlanGift.deleteMany({ where: { familyKey } }),
    ...(resetChildren
      ? [prisma.familyPlanChild.deleteMany({ where: { familyKey } })]
      : [prisma.familyPlanChild.updateMany({ where: { familyKey }, data: { points: 0 } })]),
  ])

  if (createStarterChildren) {
    await prisma.$transaction(
      starterChildren.map((child) =>
        prisma.familyPlanChild.upsert({
          where: {
            familyKey_childKey: {
              familyKey,
              childKey: child.childKey,
            },
          },
          create: {
            ...child,
            familyKey,
            ageBand: child.grade === '一年级' || child.grade === '二年级' || child.grade === '三年级' ? 'lower_primary' : 'upper_primary',
            points: 0,
          },
          update: {
            childCode: child.childCode,
            pinCode: child.pinCode,
            avatar: child.avatar,
            points: 0,
          },
        }),
      ),
    )
  }

  const after = await countFamilyPlanRows()
  console.log(JSON.stringify({ familyKey, before, after }, null, 2))
}

resetFamilyPlanData()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
