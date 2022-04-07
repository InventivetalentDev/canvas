import express, { NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";
import * as fs from "fs";
import { PNG } from "pngjs";
import compression from "compression";

const app = express()
const port = 3000

export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
        res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE, PUT");
        res.header("Access-Control-Allow-Headers", "X-Requested-With, Accept, Content-Type, Origin");
        res.header("Access-Control-Request-Headers", "X-Requested-With, Accept, Content-Type, Origin");
        return res.sendStatus(200);
    } else {
        return next();
    }
};

app.use(compression());
app.use(corsMiddleware)
app.use(bodyParser.json());

const CHUNK_SIZE = 128;

const WIDTH = CHUNK_SIZE * 8;
const HEIGHT = CHUNK_SIZE * 8;
const COLORS = [
    '#ffffff',
    '#000000',
    '#ff0000',
    '#ffff00',
    '#00ff00',
    '#00ffff',
    '#0000ff',
    '#ff00ff'
]

const CHUNKS: Buffer[][] = [[]]
for (let x = 0; x < WIDTH / CHUNK_SIZE; x++) {
    CHUNKS[x] = [];
    for (let y = 0; y < HEIGHT / CHUNK_SIZE; y++) {
        CHUNKS[x][y] = Buffer.alloc(CHUNK_SIZE * CHUNK_SIZE);

        const bufs: Buffer[] = [];
        const f = `data/c_${ x }_${ y }.bin`;
        if (!fs.existsSync(f)) continue;
        const stream = fs.createReadStream(f);
        stream.on("data", function (d) {
            bufs.push(d as Buffer)
        });
        stream.on("end", function () {
            CHUNKS[x][y] = Buffer.concat(bufs);
        });
    }
}


app.get('/', async (req: Request, res: Response) => {
    res.send('Hello World!')
})

app.get('/hello', async (req: Request, res: Response) => {
    res.json({
        w: WIDTH,
        h: HEIGHT,
        c: COLORS
    })
});

app.get('/chunk/:x/:y', async (req: Request, res: Response) => {
    const cX = parseInt(req.params['x']);
    const cY = parseInt(req.params['y']);

    if (cX < 0 || cX > WIDTH / CHUNK_SIZE || cY < 0 || cY > HEIGHT / CHUNK_SIZE) {
        res.status(400).end();
        return;
    }

    const chunk = CHUNKS[cX][cY];
    res.header('Content-Type', 'application/octet-stream');
    res.write(chunk, 'binary');
    res.end();
});

app.put('/place', async (req: Request, res: Response) => {
    if (!req.body || req.body.length !== 3) {
        res.status(400).end();
        return;
    }
    const [x, y, v] = req.body;
    if (x < 0 || y < 0 || x > WIDTH || y > HEIGHT || v < 0 || v > COLORS.length) {
        res.status(400).end();
        return;
    }
    const cX = Math.floor(x / CHUNK_SIZE);
    const cY = Math.floor(y / CHUNK_SIZE);
    const chunk = CHUNKS[cX][cY];

    const iX = x - (cX * CHUNK_SIZE);
    const iY = y - (cY * CHUNK_SIZE);
    chunk.writeUInt8(v, (iY * CHUNK_SIZE) + iX);

    const stream = fs.createWriteStream(`data/c_${ cX }_${ cY }.bin`)
    stream.write(chunk);
    stream.on("end", function () {
        stream.end();
    });

    res.end();
});


app.listen(port, () => {
    console.log(`Example app listening on port ${ port }`)
})


