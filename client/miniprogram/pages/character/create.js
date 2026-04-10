const app = getApp()

const GRID_SIZE = 8
const EDITOR_SIZE = 320
const PREVIEW_SIZE = 200
const EYE_COLOR = '#0f172a'

const SKIN_TONES = [
  { label: '白皙', value: '#f8d5b5' },
  { label: '自然', value: '#e7b98d' },
  { label: '小麦', value: '#c98f5d' },
]

const HAIR_COLORS = [
  { label: '黑色', value: '#1f2937' },
  { label: '棕色', value: '#6b3f2a' },
  { label: '金色', value: '#d4a017' },
  { label: '蓝黑', value: '#1e3a8a' },
]

const HAIR_STYLES = [
  { label: '短碎发', value: 'short', gender: 'boy' },
  { label: '飞机头', value: 'spike', gender: 'boy' },
  { label: '卷发', value: 'curly', gender: 'boy' },
  { label: '双马尾', value: 'twin', gender: 'girl' },
  { label: '齐刘海', value: 'bangs', gender: 'girl' },
  { label: '波波头', value: 'bob', gender: 'girl' },
]

const EXPRESSIONS = [
  { label: '微笑', value: 'happy' },
  { label: '惊讶', value: 'surprised' },
  { label: '眨眼', value: 'wink' },
  { label: '酷酷', value: 'cool' },
]

const PRESETS = [
  { id: 'boy-1', name: '男孩·短碎发', gender: 'boy', skinTone: '#e7b98d', hairStyle: 'short', hairColor: '#1f2937', expression: 'happy' },
  { id: 'boy-2', name: '男孩·飞机头', gender: 'boy', skinTone: '#f8d5b5', hairStyle: 'spike', hairColor: '#6b3f2a', expression: 'cool' },
  { id: 'boy-3', name: '男孩·卷发', gender: 'boy', skinTone: '#c98f5d', hairStyle: 'curly', hairColor: '#1e3a8a', expression: 'wink' },
  { id: 'girl-1', name: '女孩·双马尾', gender: 'girl', skinTone: '#f8d5b5', hairStyle: 'twin', hairColor: '#6b3f2a', expression: 'happy' },
  { id: 'girl-2', name: '女孩·齐刘海', gender: 'girl', skinTone: '#e7b98d', hairStyle: 'bangs', hairColor: '#1f2937', expression: 'surprised' },
  { id: 'girl-3', name: '女孩·波波头', gender: 'girl', skinTone: '#c98f5d', hairStyle: 'bob', hairColor: '#d4a017', expression: 'wink' },
]

function buildEmptyGrid() {
  return Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => 'transparent'))
}

function paintHair(grid, style, hairColor) {
  if (style === 'short') {
    for (let c = 2; c <= 5; c += 1) {
      grid[1][c] = hairColor
      grid[2][c] = hairColor
    }
    grid[2][1] = hairColor
    grid[2][6] = hairColor
    return
  }

  if (style === 'spike') {
    grid[0][2] = hairColor
    grid[0][4] = hairColor
    grid[0][6] = hairColor
    for (let c = 1; c <= 6; c += 1) {
      grid[1][c] = hairColor
    }
    for (let c = 2; c <= 5; c += 1) {
      grid[2][c] = hairColor
    }
    return
  }

  if (style === 'curly') {
    for (let c = 1; c <= 6; c += 1) {
      grid[1][c] = hairColor
      if (c !== 3 && c !== 4) {
        grid[2][c] = hairColor
      }
    }
    grid[2][0] = hairColor
    grid[2][7] = hairColor
    return
  }

  if (style === 'twin') {
    for (let c = 2; c <= 5; c += 1) {
      grid[1][c] = hairColor
      grid[2][c] = hairColor
    }
    grid[2][1] = hairColor
    grid[2][6] = hairColor
    grid[3][0] = hairColor
    grid[3][7] = hairColor
    grid[4][0] = hairColor
    grid[4][7] = hairColor
    return
  }

  if (style === 'bangs') {
    for (let c = 1; c <= 6; c += 1) {
      grid[1][c] = hairColor
      grid[2][c] = hairColor
    }
    grid[3][2] = hairColor
    grid[3][5] = hairColor
    return
  }

  for (let c = 1; c <= 6; c += 1) {
    grid[1][c] = hairColor
    grid[2][c] = hairColor
  }
  grid[3][1] = hairColor
  grid[3][6] = hairColor
}

function paintFace(grid, skinTone, expression) {
  for (let r = 2; r <= 6; r += 1) {
    for (let c = 2; c <= 5; c += 1) {
      grid[r][c] = skinTone
    }
  }

  if (expression === 'cool') {
    grid[4][2] = EYE_COLOR
    grid[4][3] = EYE_COLOR
    grid[4][4] = EYE_COLOR
    grid[4][5] = EYE_COLOR
    grid[5][3] = '#334155'
    grid[5][4] = '#334155'
    return
  }

  if (expression === 'wink') {
    grid[4][3] = EYE_COLOR
    grid[4][4] = skinTone
    grid[5][4] = EYE_COLOR
    grid[6][3] = '#ef4444'
    return
  }

  if (expression === 'surprised') {
    grid[4][3] = EYE_COLOR
    grid[4][4] = EYE_COLOR
    grid[6][3] = EYE_COLOR
    grid[6][4] = EYE_COLOR
    return
  }

  grid[4][3] = EYE_COLOR
  grid[4][4] = EYE_COLOR
  grid[6][3] = '#ef4444'
  grid[6][4] = '#ef4444'
}

function buildPixelGrid(config) {
  const grid = buildEmptyGrid()
  paintHair(grid, config.hairStyle, config.hairColor)
  paintFace(grid, config.skinTone, config.expression)
  return grid
}

Page({
  data: {
    characterName: '',
    presets: PRESETS,
    selectedPresetId: PRESETS[0].id,
    selectedGender: PRESETS[0].gender,
    skinTones: SKIN_TONES,
    hairColors: HAIR_COLORS,
    hairStyles: HAIR_STYLES,
    availableHairStyles: HAIR_STYLES.filter((item) => item.gender === PRESETS[0].gender),
    expressions: EXPRESSIONS,
    skinToneIndex: 0,
    hairStyleIndex: 0,
    hairColorIndex: 0,
    expressionIndex: 0,
    palette: [],
    currentColor: '#1f2937',
    pixelGrid: buildEmptyGrid(),
    saving: false,
  },

  onLoad() {
    this.applyPreset(PRESETS[0])
  },

  onReady() {
    this.initCanvas()
  },

  onNameInput(e) {
    this.setData({ characterName: e.detail.value })
  },

  async initCanvas() {
    const dpr = wx.getSystemInfoSync().pixelRatio || 1
    const query = wx.createSelectorQuery().in(this)
    query.select('#editorCanvas').fields({ node: true, size: true })
    query.select('#previewCanvas').fields({ node: true, size: true })
    query.exec((res) => {
      if (!res || !res[0] || !res[1]) {
        return
      }
      const editor = res[0]
      const preview = res[1]

      this.editorCanvas = editor.node
      this.previewCanvas = preview.node

      this.editorCtx = this.editorCanvas.getContext('2d')
      this.previewCtx = this.previewCanvas.getContext('2d')

      this.editorCanvas.width = editor.width * dpr
      this.editorCanvas.height = editor.height * dpr
      this.editorCtx.scale(dpr, dpr)

      this.previewCanvas.width = preview.width * dpr
      this.previewCanvas.height = preview.height * dpr
      this.previewCtx.scale(dpr, dpr)

      this.editorSize = editor.width || EDITOR_SIZE
      this.previewSize = preview.width || PREVIEW_SIZE

      this.redraw()
    })
  },

  redraw() {
    this.drawEditorCanvas()
    this.drawPreviewCanvas()
  },

  drawEditorCanvas() {
    if (!this.editorCtx) {
      return
    }

    const ctx = this.editorCtx
    const size = this.editorSize || EDITOR_SIZE
    const cellSize = size / GRID_SIZE

    ctx.clearRect(0, 0, size, size)

    for (let r = 0; r < GRID_SIZE; r += 1) {
      for (let c = 0; c < GRID_SIZE; c += 1) {
        const color = this.data.pixelGrid[r][c]
        const x = c * cellSize
        const y = r * cellSize

        if (color === 'transparent') {
          ctx.fillStyle = (r + c) % 2 === 0 ? '#1e293b' : '#334155'
          ctx.fillRect(x, y, cellSize, cellSize)
        } else {
          ctx.fillStyle = color
          ctx.fillRect(x, y, cellSize, cellSize)
        }
      }
    }

    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 1
    for (let i = 0; i <= GRID_SIZE; i += 1) {
      const linePos = i * cellSize
      ctx.beginPath()
      ctx.moveTo(0, linePos)
      ctx.lineTo(size, linePos)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(linePos, 0)
      ctx.lineTo(linePos, size)
      ctx.stroke()
    }
  },

  drawPreviewCanvas() {
    if (!this.previewCtx) {
      return
    }

    const ctx = this.previewCtx
    const size = this.previewSize || PREVIEW_SIZE
    const cellSize = size / GRID_SIZE

    ctx.clearRect(0, 0, size, size)
    ctx.fillStyle = '#0b1220'
    ctx.fillRect(0, 0, size, size)

    for (let r = 0; r < GRID_SIZE; r += 1) {
      for (let c = 0; c < GRID_SIZE; c += 1) {
        const color = this.data.pixelGrid[r][c]
        if (color === 'transparent') {
          continue
        }
        ctx.fillStyle = color
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize)
      }
    }
  },

  onGridTouch(e) {
    if (!e.touches || !e.touches.length) {
      return
    }

    const touch = e.touches[0]
    const size = this.editorSize || EDITOR_SIZE
    const cellSize = size / GRID_SIZE
    const col = Math.floor(touch.x / cellSize)
    const row = Math.floor(touch.y / cellSize)

    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
      return
    }

    const nextGrid = this.data.pixelGrid.map((line) => line.slice())
    nextGrid[row][col] = this.data.currentColor

    this.setData({ pixelGrid: nextGrid }, () => this.redraw())
  },

  onSelectColor(e) {
    this.setData({ currentColor: e.currentTarget.dataset.color })
  },

  onSkinToneChange(e) {
    const idx = Number(e.detail.value)
    this.setData({ skinToneIndex: idx }, () => this.rebuildFromOptions())
  },

  onHairColorChange(e) {
    const idx = Number(e.detail.value)
    this.setData({ hairColorIndex: idx }, () => this.rebuildFromOptions())
  },

  onExpressionChange(e) {
    const idx = Number(e.detail.value)
    this.setData({ expressionIndex: idx }, () => this.rebuildFromOptions())
  },

  onHairStyleChange(e) {
    const idx = Number(e.detail.value)
    this.setData({ hairStyleIndex: idx }, () => this.rebuildFromOptions())
  },

  onSelectPreset(e) {
    const presetId = e.currentTarget.dataset.id
    const preset = PRESETS.find((item) => item.id === presetId)
    if (!preset) {
      return
    }
    this.applyPreset(preset)
  },

  onReset() {
    const currentPreset = PRESETS.find((item) => item.id === this.data.selectedPresetId) || PRESETS[0]
    this.applyPreset(currentPreset)
  },

  updateHairStyleOptions(gender, hairStyleValue) {
    const availableHairStyles = HAIR_STYLES.filter((item) => item.gender === gender)
    const targetValue = hairStyleValue || availableHairStyles[0].value
    const hairStyleIndex = Math.max(availableHairStyles.findIndex((item) => item.value === targetValue), 0)

    this.setData({
      availableHairStyles,
      hairStyleIndex,
    })
  },

  updatePalette() {
    const skinTone = SKIN_TONES[this.data.skinToneIndex].value
    const hairColor = HAIR_COLORS[this.data.hairColorIndex].value
    const palette = [
      { value: 'transparent' },
      { value: skinTone },
      { value: hairColor },
      { value: EYE_COLOR },
      { value: '#ef4444' },
      { value: '#60a5fa' },
      { value: '#22c55e' },
      { value: '#f59e0b' },
      { value: '#f8fafc' },
    ]

    let currentColor = this.data.currentColor
    if (!palette.some((item) => item.value === currentColor)) {
      currentColor = hairColor
    }

    this.setData({
      palette,
      currentColor,
    })
  },

  rebuildFromOptions() {
    const skinTone = SKIN_TONES[this.data.skinToneIndex].value
    const hairColor = HAIR_COLORS[this.data.hairColorIndex].value
    const hairStyle = this.data.availableHairStyles[this.data.hairStyleIndex].value
    const expression = EXPRESSIONS[this.data.expressionIndex].value

    const pixelGrid = buildPixelGrid({
      skinTone,
      hairColor,
      hairStyle,
      expression,
    })

    this.updatePalette()
    this.setData({ pixelGrid }, () => this.redraw())
  },

  applyPreset(preset) {
    const skinToneIndex = Math.max(SKIN_TONES.findIndex((item) => item.value === preset.skinTone), 0)
    const hairColorIndex = Math.max(HAIR_COLORS.findIndex((item) => item.value === preset.hairColor), 0)
    const expressionIndex = Math.max(EXPRESSIONS.findIndex((item) => item.value === preset.expression), 0)

    this.updateHairStyleOptions(preset.gender, preset.hairStyle)
    const hairStyles = HAIR_STYLES.filter((item) => item.gender === preset.gender)
    const hairStyleIndex = Math.max(hairStyles.findIndex((item) => item.value === preset.hairStyle), 0)

    const pixelGrid = buildPixelGrid({
      skinTone: preset.skinTone,
      hairStyle: preset.hairStyle,
      hairColor: preset.hairColor,
      expression: preset.expression,
    })

    this.setData(
      {
        selectedPresetId: preset.id,
        selectedGender: preset.gender,
        skinToneIndex,
        hairColorIndex,
        expressionIndex,
        hairStyleIndex,
        pixelGrid,
      },
      () => {
        this.updatePalette()
        this.redraw()
      }
    )
  },

  requestPost(url, data) {
    return new Promise((resolve, reject) => {
      wx.request({
        url,
        method: 'POST',
        data,
        header: {
          'content-type': 'application/json',
        },
        success: resolve,
        fail: reject,
      })
    })
  },

  async onSaveCharacter() {
    const name = (this.data.characterName || '').trim()
    if (!name) {
      wx.showToast({ title: '请先输入名字', icon: 'none' })
      return
    }

    const skinTone = SKIN_TONES[this.data.skinToneIndex].value
    const hairColor = HAIR_COLORS[this.data.hairColorIndex].value
    const hairStyle = this.data.availableHairStyles[this.data.hairStyleIndex].value
    const expression = EXPRESSIONS[this.data.expressionIndex].value

    const payload = {
      name,
      gender: this.data.selectedGender,
      appearance: {
        skinTone,
        hairColor,
        hairStyle,
        expression,
      },
      pixels: this.data.pixelGrid,
      gridSize: GRID_SIZE,
    }

    this.setData({ saving: true })

    let savedCharacter = null
    let saveToastTitle = '角色已保存'

    try {
      const res = await this.requestPost(`${app.globalData.serverUrl}/character`, payload)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        savedCharacter = res.data && Object.keys(res.data).length ? res.data : payload
      } else {
        throw new Error(`status ${res.statusCode}`)
      }
    } catch (err) {
      savedCharacter = payload
      saveToastTitle = '离线保存成功'
    }

    const realCharacterId = savedCharacter.id || savedCharacter.characterId
    const characterId = realCharacterId || `local-${Date.now()}`
    savedCharacter = Object.assign({}, savedCharacter, { id: characterId })

    app.globalData.character = savedCharacter
    // Only persist characterId if it came from server. Local fallback ids would
    // cause /api/home/summary to 404 on next launch and trap the user in a loop.
    if (realCharacterId) {
      wx.setStorageSync('characterId', realCharacterId)
    }
    wx.setStorageSync('pixelgrow_character', savedCharacter)

    this.setData({ saving: false })
    wx.showToast({ title: saveToastTitle, icon: 'success' })

    setTimeout(() => {
      wx.reLaunch({ url: '/pages/home/index' })
    }, 700)
  },
})
