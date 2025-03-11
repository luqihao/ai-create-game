// 生成占位符图片的函数
export function generatePlaceholderImage(text: string, width = 300, height = 200): string {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (ctx) {
        // 设置背景
        ctx.fillStyle = '#3498db'
        ctx.fillRect(0, 0, width, height)

        // 设置文本
        ctx.font = 'bold 24px Arial'
        ctx.fillStyle = 'white'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, width / 2, height / 2)
    }

    return canvas.toDataURL('image/png')
}
