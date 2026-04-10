const app = getApp()

const TYPE_META = {
  LEARNING: { label: '学习', emoji: '📚' },
  LIFE: { label: '生活', emoji: '🏠' },
  SOCIAL: { label: '社交', emoji: '🤝' },
  SURPRISE: { label: '惊喜', emoji: '⭐' },
}

const TYPE_ORDER = ['LEARNING', 'LIFE', 'SOCIAL', 'SURPRISE']

const STATUS_LABEL = {
  PENDING: '待完成',
  COMPLETED: '已完成',
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeType(rawType) {
  const value = String(rawType || '').toUpperCase()
  if (value === 'STUDY') return 'LEARNING'
  if (value === 'HOME') return 'LIFE'
  if (TYPE_META[value]) return value
  return 'SURPRISE'
}

function normalizeStatus(rawStatus) {
  const value = String(rawStatus || '').toUpperCase()
  return value === 'COMPLETED' ? 'COMPLETED' : 'PENDING'
}

function normalizeTask(task = {}) {
  const type = normalizeType(task.type || task.category)
  const status = normalizeStatus(task.status)
  const rewards = task.rewards || {}
  const exp = safeNumber(task.expReward ?? task.exp_reward ?? rewards.exp)
  const coins = safeNumber(task.coinReward ?? task.coin_reward ?? rewards.coins)

  return {
    id: String(task.id || ''),
    icon: task.icon || TYPE_META[type].emoji,
    title: task.title || task.name || '未命名任务',
    description: task.description || task.detail || '完成任务即可获得奖励。',
    type,
    rewards: {
      exp,
      coins,
    },
    status,
    statusLabel: STATUS_LABEL[status],
  }
}

Page({
  data: {
    loading: false,
    savingId: '',
    errorText: '',
    tasks: [],
    groupedTasks: [],
    selectedTask: null,
    showDetail: false,
    totalExpToday: 0,
    expFlyVisible: false,
    expFlyValue: 0,
    expFlyStyle: '',
    expFlyAnimation: null,
  },

  onLoad() {
    this.loadTodayTasks()
  },

  onPullDownRefresh() {
    this.loadTodayTasks().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadTodayTasks() {
    this.setData({ loading: true, errorText: '' })

    try {
      const response = await this.request('/tasks/today')
      const list = Array.isArray(response) ? response : response.tasks
      const tasks = (Array.isArray(list) ? list : []).map(normalizeTask)
      this.syncTaskState(tasks)
    } catch (err) {
      console.error('[Tasks] loadTodayTasks failed:', err)
      this.setData({ errorText: '任务加载失败，请稍后重试。' })
      this.syncTaskState(this.getFallbackTasks())
    } finally {
      this.setData({ loading: false })
    }
  },

  request(path, method = 'GET', data) {
    const baseUrl = (app.globalData && app.globalData.serverUrl) || ''

    return new Promise((resolve, reject) => {
      wx.request({
        url: `${baseUrl}${path}`,
        method,
        data,
        timeout: 10000,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data || {})
            return
          }
          reject(new Error(`HTTP ${res.statusCode}`))
        },
        fail: reject,
      })
    })
  },

  syncTaskState(tasks) {
    const groupedTasks = this.groupTasks(tasks)
    const totalExpToday = tasks
      .filter((item) => item.status === 'COMPLETED')
      .reduce((sum, item) => sum + safeNumber(item.rewards.exp), 0)

    this.setData({
      tasks,
      groupedTasks,
      totalExpToday,
    })
  },

  groupTasks(tasks) {
    return TYPE_ORDER.map((type) => {
      const meta = TYPE_META[type]
      const items = tasks.filter((task) => task.type === type)

      return {
        type,
        title: `${meta.emoji} ${meta.label}`,
        items,
      }
    }).filter((group) => group.items.length > 0)
  },

  onTaskTap(e) {
    const { id } = e.currentTarget.dataset
    const task = this.data.tasks.find((item) => item.id === String(id))
    if (!task) return

    this.setData({
      selectedTask: task,
      showDetail: true,
    })
  },

  closeDetail() {
    this.setData({
      showDetail: false,
      selectedTask: null,
    })
  },

  async onCompleteTask(e) {
    const { id } = e.currentTarget.dataset
    const taskId = String(id)
    const task = this.data.tasks.find((item) => item.id === taskId)

    if (!task || task.status === 'COMPLETED' || this.data.savingId) {
      return
    }

    this.setData({ savingId: taskId })

    try {
      await this.request(`/tasks/${taskId}/complete`, 'PUT')

      const nextTasks = this.data.tasks.map((item) => {
        if (item.id !== taskId) return item
        return {
          ...item,
          status: 'COMPLETED',
          statusLabel: STATUS_LABEL.COMPLETED,
        }
      })

      this.syncTaskState(nextTasks)
      this.playExpFlyAnimation(safeNumber(task.rewards.exp), taskId)
      wx.vibrateShort()
    } catch (err) {
      console.error('[Tasks] complete task failed:', err)
      wx.showToast({ title: '完成失败，请重试', icon: 'none' })
    } finally {
      this.setData({ savingId: '' })
    }
  },

  playExpFlyAnimation(expValue, taskId) {
    const query = wx.createSelectorQuery()

    query.select(`#complete-btn-${taskId}`).boundingClientRect()
    query.select('.exp-bank').boundingClientRect()
    query.exec((rects) => {
      const startRect = rects[0]
      const endRect = rects[1]

      if (!startRect || !endRect) {
        wx.showToast({ title: `+${expValue} EXP`, icon: 'none' })
        return
      }

      const startX = startRect.left + startRect.width / 2
      const startY = startRect.top + startRect.height / 2
      const endX = endRect.left + endRect.width - 20
      const endY = endRect.top + endRect.height / 2

      const moveX = endX - startX
      const moveY = endY - startY

      const animation = wx.createAnimation({
        duration: 750,
        timingFunction: 'ease-in-out',
      })

      this.setData({
        expFlyVisible: true,
        expFlyValue: expValue,
        expFlyStyle: `left:${startX}px;top:${startY}px;`,
        expFlyAnimation: null,
      })

      setTimeout(() => {
        animation.translate(moveX, moveY).scale(0.6).opacity(0).step()
        this.setData({ expFlyAnimation: animation.export() })
      }, 30)

      setTimeout(() => {
        this.setData({
          expFlyVisible: false,
          expFlyAnimation: null,
        })
        wx.showToast({ title: `+${expValue} EXP`, icon: 'none' })
      }, 850)
    })
  },

  getFallbackTasks() {
    return [
      {
        id: 'fallback-1',
        icon: '📚',
        title: '完成今日作业',
        description: '数学练习册 2 页，英文阅读 15 分钟。',
        type: 'LEARNING',
        rewards: { exp: 30, coins: 20 },
        status: 'PENDING',
        statusLabel: STATUS_LABEL.PENDING,
      },
      {
        id: 'fallback-2',
        icon: '🏠',
        title: '整理书桌',
        description: '把书本分类放好，擦干净桌面。',
        type: 'LIFE',
        rewards: { exp: 15, coins: 10 },
        status: 'COMPLETED',
        statusLabel: STATUS_LABEL.COMPLETED,
      },
      {
        id: 'fallback-3',
        icon: '🤝',
        title: '帮助家人完成一件小事',
        description: '例如帮忙拿快递、摆放餐具。',
        type: 'SOCIAL',
        rewards: { exp: 20, coins: 12 },
        status: 'PENDING',
        statusLabel: STATUS_LABEL.PENDING,
      },
      {
        id: 'fallback-4',
        icon: '⭐',
        title: '创意惊喜任务',
        description: '画一张今天心情的像素画。',
        type: 'SURPRISE',
        rewards: { exp: 25, coins: 18 },
        status: 'PENDING',
        statusLabel: STATUS_LABEL.PENDING,
      },
    ]
  },

  noop() {},
})
