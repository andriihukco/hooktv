// Maze generator for Astray: a walled grid with every room reachable.
export function maze(n, rnd = Math.random){
    const size = n * 2 + 1, g = Array.from({length: size}, () => Array(size).fill(1)), stack = [[1, 1]]

    g[1][1] = 0

    while(stack.length){
        const [x, y] = stack[stack.length - 1]
        const next = [[2, 0], [-2, 0], [0, 2], [0, -2]].filter(([dx, dy]) => g[y + dy] && g[y + dy][x + dx] === 1).sort(() => rnd() - .5)

        if(!next.length){ stack.pop(); continue }

        const [dx, dy] = next[0]

        g[y + dy / 2][x + dx / 2] = 0
        g[y + dy][x + dx] = 0
        stack.push([x + dx, y + dy])
    }

    return g
}
