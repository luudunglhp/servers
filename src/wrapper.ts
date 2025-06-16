import express from 'express';
import { spawn } from 'child_process';
import readline from 'readline';

async function main() {
  // 1) Spawn the MCP server CLI
  const mcp = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  // 2) Line-reader to collect JSON messages
  const rl = readline.createInterface({ input: mcp.stdout });

  type QueueEntry = {
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
  };

  const pending: QueueEntry[] = [];

  rl.on('line', (line) => {
    let msg: any;
    try {
      msg = JSON.parse(line);
    } catch (err) {
      console.error('⚠️ Failed to parse MCP output:', line);
      return;
    }

    if (pending.length) {
      pending.shift()!.resolve(msg);
    } else {
      console.error('⚠️ Unexpected MCP response:', msg);
    }
  });

  // 3) Express HTTP app
  const app = express();
  app.use(express.json());

  app.post('/mcp', async (req, res) => {
    try {
      const payload = req.body;
      const result = await new Promise<any>((resolve, reject) => {
        pending.push({ resolve, reject });
        mcp.stdin.write(JSON.stringify(payload) + '\n');
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4) Start listening
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 HTTP↔STDIO bridge listening on 0.0.0.0:${port}`);
  });
}

main().catch((err) => {
  console.error('❌ Wrapper failed to start:', err);
  process.exit(1);
});
