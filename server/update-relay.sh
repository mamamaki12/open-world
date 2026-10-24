#!/bin/sh
# EC2 で中継を main の最新にする（EC2 Instance Connect の画面で1行貼るだけ）
#   curl -fsSL https://raw.githubusercontent.com/mamamaki12/open-world/main/server/update-relay.sh | sh
set -e
cd /home/ec2-user/open-world-relay
cp relay.mjs relay.mjs.bak
curl -fsSLo relay.mjs.new https://raw.githubusercontent.com/mamamaki12/open-world/main/server/dist/relay.mjs
mv relay.mjs.new relay.mjs
sudo systemctl restart open-world-relay
sleep 2
echo "health: $(curl -fsS http://127.0.0.1:8787/health)"
echo "version: $(curl -fsS http://127.0.0.1:8787/version)"
echo "更新できました（戻すとき: cd /home/ec2-user/open-world-relay && cp relay.mjs.bak relay.mjs && sudo systemctl restart open-world-relay）"
