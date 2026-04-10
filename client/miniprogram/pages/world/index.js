const { get } = require('../../utils/request')

const TILE_WIDTH = 96
const TILE_HEIGHT = 48
const BASE_BUILDING_HEIGHT = 62
const MIN_ZOOM = 0.72
const MAX_ZOOM = 1.45

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function formatCharacterName(character) {
  if (!character || !character.name) {
    return '小小冒险家'
  }
  return character.name
}

Page({
  data: {
    character: {
      name: '小小冒险家',
      level: 1,
      profession: '见习骑士',
    },
    loading: false,
    errorMessage: '',
    selectedBuildingName: '冒险者城堡',
    selectedBuildingDesc: '这是你的家，也是每次冒险的起点。',
    zoomText: '100%',
  },

  world: {
    width: 15,
    height: 15,
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
  },

  touchState: {
    dragging: false,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
    moved: false,
    pinchActive: false,
    pinchStartDistance: 0,
    pinchStartZoom: 1,
  },

  canvasNode: null,
  ctx: null,
  canvasWidth: 0,
  canvasHeight: 0,
  pixelRatio: 1,
  canvasRect: null,
  buildings: [],
  playerTile: { x: 7, y: 8 },

  onLoad() {
    this.initWorldConfig()
    this.loadHomeSummary()
  },

  onReady() {
    this.initCanvas()
  },

  onShow() {
    this.loadHomeSummary()
  },

  onPullDownRefresh() {
    this.loadHomeSummary(true)
  },

  initWorldConfig() {
    this.buildings = [
      {
        key: 'home',
        name: '冒险者城堡',
        desc: '这是你的家，也是每次冒险的起点。',
        x: 5,
        y: 4,
        w: 2,
        h: 2,
        height: 88,
        wallColor: '#73512e',
        roofColor: '#b8874d',
        accentColor: '#ffd76d',
      },
      {
        key: 'school',
        name: '智慧学院',
        desc: '在这里学习技能与知识，解锁新的成长章节。',
        x: 9,
        y: 6,
        w: 2,
        h: 2,
        height: 84,
        wallColor: '#3a4e83',
        roofColor: '#5777c5',
        accentColor: '#ffd670',
      },
      {
        key: 'shop',
        name: '星辉商店',
        desc: '购买道具和补给，为下一次探险做好准备。',
        x: 3,
        y: 9,
        w: 2,
        h: 2,
        height: 74,
        wallColor: '#4d3a5e',
        roofColor: '#815ca0',
        accentColor: '#ffda73',
      },
      {
        key: 'forest',
        name: '精灵森林',
        desc: '神秘森林区域，隐藏着稀有任务和伙伴。',
        x: 11,
        y: 3,
        w: 2,
        h: 3,
        height: 66,
        wallColor: '#28504b',
        roofColor: '#3b8a75',
        accentColor: '#98f0cd',
      },
    ]
  },

  async loadHomeSummary(byPullDown = false) {
    this.setData({ loading: true, errorMessage: '' })

    try {
      const response = await get('/api/home/summary')
      this.setData({
        character: response.character || this.data.character,
      })
    } catch (error) {
      console.error('[World] load summary failed:', error)
      this.setData({
        errorMessage: '角色信息同步失败，已显示默认角色。',
      })
    } finally {
      this.setData({ loading: false })
      if (byPullDown) {
        wx.stopPullDownRefresh()
      }
      this.drawWorld()
    }
  },

  initCanvas() {
    const query = wx.createSelectorQuery()
    query
      .select('#worldCanvas')
      .fields({ node: true, size: true, rect: true })
      .exec((res) => {
        const canvasInfo = res && res[0]
        if (!canvasInfo || !canvasInfo.node) {
          return
        }

        const dpr = wx.getSystemInfoSync().pixelRatio || 1
        const canvas = canvasInfo.node
        canvas.width = canvasInfo.width * dpr
        canvas.height = canvasInfo.height * dpr

        const ctx = canvas.getContext('2d')
        ctx.scale(dpr, dpr)

        this.canvasNode = canvas
        this.ctx = ctx
        this.canvasWidth = canvasInfo.width
        this.canvasHeight = canvasInfo.height
        this.pixelRatio = dpr
        this.canvasRect = {
          left: canvasInfo.left || 0,
          top: canvasInfo.top || 0,
          width: canvasInfo.width,
          height: canvasInfo.height,
        }

        this.drawWorld()
      })
  },

  getWorldOrigin() {
    return {
      x: this.canvasWidth * 0.5,
      y: this.canvasHeight * 0.24,
    }
  },

  tileToScreen(tileX, tileY) {
    const halfW = (TILE_WIDTH * this.world.zoom) / 2
    const halfH = (TILE_HEIGHT * this.world.zoom) / 2
    const origin = this.getWorldOrigin()

    return {
      x: origin.x + (tileX - tileY) * halfW + this.world.offsetX,
      y: origin.y + (tileX + tileY) * halfH + this.world.offsetY,
    }
  },

  screenToTile(screenX, screenY) {
    const halfW = (TILE_WIDTH * this.world.zoom) / 2
    const halfH = (TILE_HEIGHT * this.world.zoom) / 2
    const origin = this.getWorldOrigin()

    const tx = (screenX - origin.x - this.world.offsetX) / halfW
    const ty = (screenY - origin.y - this.world.offsetY) / halfH

    return {
      x: (tx + ty) / 2,
      y: (ty - tx) / 2,
    }
  },

  getTouchLocalPosition(touch) {
    if (!this.canvasRect) {
      return { x: touch.x, y: touch.y }
    }

    return {
      x: touch.x - this.canvasRect.left,
      y: touch.y - this.canvasRect.top,
    }
  },

  getPinchDistance(touches) {
    const [a, b] = touches
    const dx = a.x - b.x
    const dy = a.y - b.y
    return Math.sqrt(dx * dx + dy * dy)
  },

  onTouchStart(e) {
    const touches = e.touches || []
    if (!touches.length) {
      return
    }

    if (touches.length >= 2) {
      const distance = this.getPinchDistance(touches)
      this.touchState.pinchActive = true
      this.touchState.pinchStartDistance = distance
      this.touchState.pinchStartZoom = this.world.zoom
      return
    }

    const local = this.getTouchLocalPosition(touches[0])
    this.touchState.dragging = true
    this.touchState.moved = false
    this.touchState.startX = local.x
    this.touchState.startY = local.y
    this.touchState.startOffsetX = this.world.offsetX
    this.touchState.startOffsetY = this.world.offsetY
  },

  onTouchMove(e) {
    const touches = e.touches || []

    if (touches.length >= 2 && this.touchState.pinchActive) {
      const distance = this.getPinchDistance(touches)
      if (this.touchState.pinchStartDistance > 0) {
        const ratio = distance / this.touchState.pinchStartDistance
        const zoom = clamp(this.touchState.pinchStartZoom * ratio, MIN_ZOOM, MAX_ZOOM)
        this.world.zoom = zoom
        this.setData({ zoomText: `${Math.round(zoom * 100)}%` })
        this.drawWorld()
      }
      return
    }

    if (!this.touchState.dragging || !touches.length) {
      return
    }

    const local = this.getTouchLocalPosition(touches[0])
    const dx = local.x - this.touchState.startX
    const dy = local.y - this.touchState.startY

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      this.touchState.moved = true
    }

    this.world.offsetX = this.touchState.startOffsetX + dx
    this.world.offsetY = this.touchState.startOffsetY + dy
    this.drawWorld()
  },

  onTouchEnd(e) {
    const changed = e.changedTouches || []

    if (this.touchState.pinchActive) {
      if ((e.touches || []).length < 2) {
        this.touchState.pinchActive = false
      }
      return
    }

    if (!this.touchState.dragging) {
      return
    }

    if (!this.touchState.moved && changed.length) {
      const local = this.getTouchLocalPosition(changed[0])
      this.handleTap(local)
    }

    this.touchState.dragging = false
  },

  handleTap(localPoint) {
    const tilePoint = this.screenToTile(localPoint.x, localPoint.y)

    const hit = this.buildings.find((building) => {
      return (
        tilePoint.x >= building.x &&
        tilePoint.x <= building.x + building.w &&
        tilePoint.y >= building.y &&
        tilePoint.y <= building.y + building.h
      )
    })

    if (!hit) {
      return
    }

    this.setData({
      selectedBuildingName: hit.name,
      selectedBuildingDesc: hit.desc,
    })

    wx.showToast({
      title: `${hit.name} · 区域信息`,
      icon: 'none',
      duration: 1500,
    })
  },

  getTerrainType(x, y) {
    const distanceToCenter = Math.abs(x - 7) + Math.abs(y - 7)
    if ((x >= 6 && x <= 8) || (y >= 6 && y <= 8)) {
      return 'road'
    }
    if ((x + y) % 7 === 0 || distanceToCenter > 10) {
      return 'water'
    }
    return 'grass'
  },

  drawDiamond(cx, cy, halfW, halfH, color) {
    const ctx = this.ctx
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + halfW, cy + halfH)
    ctx.lineTo(cx, cy + halfH * 2)
    ctx.lineTo(cx - halfW, cy + halfH)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
  },

  drawTerrainTile(x, y) {
    const point = this.tileToScreen(x, y)
    const halfW = (TILE_WIDTH * this.world.zoom) / 2
    const halfH = (TILE_HEIGHT * this.world.zoom) / 2
    const terrain = this.getTerrainType(x, y)

    let baseColor = '#2f5d46'
    let lineColor = '#407b5b'

    if (terrain === 'road') {
      baseColor = '#8e7f66'
      lineColor = '#a89678'
    } else if (terrain === 'water') {
      baseColor = '#2a5d94'
      lineColor = '#3e79ba'
    }

    this.drawDiamond(point.x, point.y, halfW, halfH, baseColor)

    const ctx = this.ctx
    ctx.beginPath()
    ctx.moveTo(point.x, point.y + halfH)
    ctx.lineTo(point.x + halfW, point.y + halfH * 2)
    ctx.lineTo(point.x, point.y + halfH * 3)
    ctx.lineTo(point.x - halfW, point.y + halfH * 2)
    ctx.closePath()
    ctx.lineWidth = Math.max(1, this.world.zoom)
    ctx.strokeStyle = lineColor
    ctx.stroke()
  },

  drawBuildingShadow(building) {
    const ctx = this.ctx
    const start = this.tileToScreen(building.x, building.y)
    const end = this.tileToScreen(building.x + building.w, building.y + building.h)
    const centerX = (start.x + end.x) / 2
    const centerY = end.y + (TILE_HEIGHT * this.world.zoom) / 2
    const shadowW = TILE_WIDTH * this.world.zoom * (building.w + 0.5)
    const shadowH = TILE_HEIGHT * this.world.zoom * (building.h * 0.55)

    ctx.fillStyle = 'rgba(10, 16, 30, 0.32)'
    ctx.beginPath()
    ctx.ellipse(centerX + 24 * this.world.zoom, centerY + 20 * this.world.zoom, shadowW / 2, shadowH / 2, -0.35, 0, Math.PI * 2)
    ctx.fill()
  },

  drawBuilding(building) {
    const ctx = this.ctx
    const top = this.tileToScreen(building.x + building.w / 2, building.y + building.h / 2)
    const halfW = (TILE_WIDTH * this.world.zoom * building.w) / 2
    const halfH = (TILE_HEIGHT * this.world.zoom * building.h) / 2
    const buildingHeight = (building.height || BASE_BUILDING_HEIGHT) * this.world.zoom

    this.drawBuildingShadow(building)

    const roofY = top.y - buildingHeight
    this.drawDiamond(top.x, roofY, halfW, halfH, building.roofColor)

    ctx.fillStyle = building.wallColor
    ctx.beginPath()
    ctx.moveTo(top.x - halfW, roofY + halfH)
    ctx.lineTo(top.x, roofY + halfH * 2)
    ctx.lineTo(top.x, top.y + halfH * 2)
    ctx.lineTo(top.x - halfW, top.y + halfH)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = this.mixColor(building.wallColor, '#111627', 0.34)
    ctx.beginPath()
    ctx.moveTo(top.x + halfW, roofY + halfH)
    ctx.lineTo(top.x, roofY + halfH * 2)
    ctx.lineTo(top.x, top.y + halfH * 2)
    ctx.lineTo(top.x + halfW, top.y + halfH)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = building.accentColor
    const flagW = Math.max(5, 8 * this.world.zoom)
    const flagH = Math.max(5, 9 * this.world.zoom)
    ctx.fillRect(top.x - flagW / 2, roofY - 16 * this.world.zoom, flagW, flagH)

    ctx.fillStyle = '#f5d66b'
    ctx.font = `${Math.max(10, 12 * this.world.zoom)}px Courier New`
    ctx.textAlign = 'center'
    ctx.fillText(building.name, top.x, top.y + halfH * 2 + 18 * this.world.zoom)
  },

  drawPlayer() {
    const ctx = this.ctx
    const tile = this.tileToScreen(this.playerTile.x, this.playerTile.y)
    const baseX = tile.x
    const baseY = tile.y + TILE_HEIGHT * this.world.zoom * 0.8
    const unit = 4 * this.world.zoom

    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)'
    ctx.beginPath()
    ctx.ellipse(baseX, baseY + unit * 2.5, unit * 4, unit * 1.7, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#ffd76a'
    ctx.fillRect(baseX - unit * 1.4, baseY - unit * 5, unit * 2.8, unit * 2)

    ctx.fillStyle = '#2e4a8b'
    ctx.fillRect(baseX - unit * 2, baseY - unit * 3, unit * 4, unit * 3.5)

    ctx.fillStyle = '#ffd76a'
    ctx.fillRect(baseX - unit * 0.8, baseY - unit * 6.2, unit * 1.6, unit * 1.2)

    ctx.fillStyle = '#89d7ff'
    ctx.fillRect(baseX - unit * 2.8, baseY - unit * 3.2, unit * 1.2, unit * 2)
    ctx.fillRect(baseX + unit * 1.6, baseY - unit * 3.2, unit * 1.2, unit * 2)

    ctx.fillStyle = '#1a243f'
    ctx.fillRect(baseX - unit * 1.6, baseY + unit * 0.6, unit * 1.2, unit * 2.5)
    ctx.fillRect(baseX + unit * 0.4, baseY + unit * 0.6, unit * 1.2, unit * 2.5)
  },

  mixColor(hexA, hexB, ratio) {
    const normalize = (hex) => {
      const clean = hex.replace('#', '')
      return {
        r: parseInt(clean.slice(0, 2), 16),
        g: parseInt(clean.slice(2, 4), 16),
        b: parseInt(clean.slice(4, 6), 16),
      }
    }

    const a = normalize(hexA)
    const b = normalize(hexB)
    const t = clamp(ratio, 0, 1)

    const r = Math.round(a.r + (b.r - a.r) * t)
    const g = Math.round(a.g + (b.g - a.g) * t)
    const bValue = Math.round(a.b + (b.b - a.b) * t)

    return `rgb(${r}, ${g}, ${bValue})`
  },

  drawBackground() {
    if (!this.ctx) {
      return
    }

    const ctx = this.ctx
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)

    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight)
    gradient.addColorStop(0, '#132140')
    gradient.addColorStop(0.55, '#101b34')
    gradient.addColorStop(1, '#0b1327')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)

    const glow = ctx.createRadialGradient(
      this.canvasWidth * 0.74,
      this.canvasHeight * 0.08,
      10,
      this.canvasWidth * 0.74,
      this.canvasHeight * 0.08,
      this.canvasWidth * 0.7
    )
    glow.addColorStop(0, 'rgba(255, 215, 0, 0.2)')
    glow.addColorStop(1, 'rgba(255, 215, 0, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)
  },

  drawWorld() {
    if (!this.ctx || !this.canvasNode) {
      return
    }

    this.drawBackground()

    for (let y = 0; y < this.world.height; y += 1) {
      for (let x = 0; x < this.world.width; x += 1) {
        this.drawTerrainTile(x, y)
      }
    }

    const sortedBuildings = this.buildings
      .slice()
      .sort((a, b) => a.x + a.y - (b.x + b.y))

    sortedBuildings.forEach((building) => {
      this.drawBuilding(building)
    })

    this.drawPlayer()
  },

  onResetView() {
    this.world.offsetX = 0
    this.world.offsetY = 0
    this.world.zoom = 1
    this.setData({ zoomText: '100%' })
    this.drawWorld()
  },

  onFocusHome() {
    const home = this.buildings.find((item) => item.key === 'home')
    if (!home) {
      return
    }

    this.setData({
      selectedBuildingName: home.name,
      selectedBuildingDesc: home.desc,
    })

    this.world.offsetX = 90
    this.world.offsetY = -30
    this.drawWorld()
  },

  onFocusSchool() {
    const school = this.buildings.find((item) => item.key === 'school')
    if (!school) {
      return
    }

    this.setData({
      selectedBuildingName: school.name,
      selectedBuildingDesc: school.desc,
    })

    this.world.offsetX = -80
    this.world.offsetY = -18
    this.drawWorld()
  },

  getWelcomeText() {
    return `${formatCharacterName(this.data.character)}，欢迎来到像素世界。`
  },
})
