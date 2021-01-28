import * as math from 'mathjs'
import './styles.css'

main()

function main() {
  const pretag = document.getElementById('rendertarget')

  const screenWidth = 60
  const screenHeight = screenWidth

  let theta = 0 // in rad

  const generateTorus = function () {
    const outerRadius = 0.8
    const outerStep = 0.2
    const innerRadius = 0.2
    const innerStep = 0.2
    const circle = []

    for (let i = 0; i < 2 * Math.PI; i += outerStep) {
      const x = Math.cos(i) * outerRadius
      const y = Math.sin(i) * outerRadius

      for (let j = 0; j < 2 * Math.PI; j += innerStep) {
        const x1 = Math.cos(j) * innerRadius
        const y1 = Math.sin(j) * innerRadius
        circle.push([x + x1, y, y1, 0])
      }
    }

    return circle
  }

  const render = function () {
    theta += 0.1
    const renderBuffer = []
    const zBuffer = []

    // initialize empty buffer
    for (let k = 0; k < screenHeight * screenWidth; k++) {
      renderBuffer[k] = k % screenWidth == screenWidth - 1 ? '\n' : ' '
      zBuffer[k] = Infinity
    }

    const camera = [0, 0, 0]
    const cameraLookAt = [0, 0, 5]
    const up = [0, Math.sqrt(2) / 2, -Math.sqrt(2) / 2]

    const object1 = generateTorus()

    const object1Origin = [-1, -2, 4, 0]

    const scene = [
      {
        origin: object1Origin,
        vertices: object1,
      },
    ]

    const eMinusCenter = math.subtract(camera, cameraLookAt)
    const zc = math.dotDivide(eMinusCenter, math.norm(eMinusCenter))

    const crossUpZc = math.cross(up, zc)
    const xc = math.dotDivide(crossUpZc, math.norm(crossUpZc))
    const yc = math.cross(zc, xc)

    const R = [
      [...xc, 0],
      [...yc, 0],
      [...zc, 0],
      [0, 0, 0, 1],
    ]

    const T = [
      [1, 0, 0, -camera[0]],
      [0, 1, 0, -camera[1]],
      [0, 0, 1, -camera[2]],
      [0, 0, 0, 1],
    ]

    const viewMatrix = math.multiply(R, T)

    // object space to world space
    const points = scene
      .map(({ origin, vertices }) => {
        return vertices.map((vertex) => {
          let v = vertex
          // rotation matrix
          const RxM = [
            [1, 0, 0, 0],
            [0, Math.cos(theta), -Math.sin(theta), 0],
            [0, Math.sin(theta), Math.cos(theta), 0],
            [0, 0, 0, 1],
          ]
          v = math.multiply(RxM, v)
          v = math.add(origin, v)
          return v
        })
      })
      .reduce((prev, curr) => [...prev, ...curr], [])

    const pointsInView = points.map((p) => math.multiply(p, viewMatrix))

    const zNear = 0.5
    const zFar = 50

    // given aspect = 1 and f = 1
    const projectionMatrix = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [
        0,
        0,
        -(zFar + zNear) / (zFar - zNear),
        -(2 * zFar * zNear) / (zFar - zNear),
      ],
      [0, 0, -1, 0],
    ]

    const pointsClipSpace = pointsInView.map((p) =>
      math.multiply(p, projectionMatrix)
    )

    // normalized device space
    const pointsNdc = pointsClipSpace
      .map((p) => {
        const perspectiveDivide = p[3]
        return math.divide(p, perspectiveDivide)
      })
      .filter((p) => p[0] >= -1 && p[0] <= 1 && p[1] >= -1 && p[1] <= 1)

    // TODO: due to the filter the index might not match in pointsNdc and pointDepths
    const pointDepths = pointsInView.map((p) => math.norm(p))

    const max = pointDepths.reduce((pre, curr) => (pre > curr ? pre : curr), 0)
    const min = pointDepths.reduce(
      (pre, curr) => (pre < curr ? pre : curr),
      Infinity
    )

    const normalizedDepths = pointDepths.map(
      (depth) => (depth - min) / (max - min)
    )

    pointsNdc.forEach((p, i) => {
      // range is from -1 to 1
      const a = math.add(p, 1)
      // TODO: this currently enforces screenWidth and screenHeight to be identical
      const pResult = math.multiply(a, screenWidth)
      const x = Math.round(pResult[0])
      const y = Math.round(pResult[1])

      const position = x + y * screenWidth

      const zIndexElement = Math.round(normalizedDepths[i] * 10)
      // Only render element if it's closer than an already rendered element
      if (zBuffer[position] > zIndexElement) {
        zBuffer[position] = zIndexElement
        renderBuffer[position] = '@$#*!=;:~-.'[zIndexElement]
      }
    })

    pretag.innerHTML = renderBuffer.join('')
  }

  setInterval(() => {
    render()
  }, 100)

  render()
}
