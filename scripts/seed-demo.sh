#!/usr/bin/env bash
# seed-demo.sh — демо-данные по ТЗ: 3 исключения + 3 записи.
# Всё идёт через HTTP API, чтобы сработали серверные проверки
# (длительность услуги, рабочие часы, конфликты, исключения).
set -euo pipefail

API="http://127.0.0.1:3001/api"
TS="10/09/2026 20:00 MSK"

login() {
  curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"otmetka\"}" | python3 -c "import sys,json;print(json.load(sys.stdin).get('token',''))"
}

ADMIN=$(login "admin@nogotochki.local")
IRINA=$(login "irina@test.local")
OLGA=$(login "olga@test.local")
DARYA=$(login "darya@test.local")

for pair in "admin:$ADMIN" "irina:$IRINA" "olga:$OLGA" "darya:$DARYA"; do
  name="${pair%%:*}"; tok="${pair##*:}"
  [ -n "$tok" ] || { echo "❌ не удалось войти: $name"; exit 1; }
done
echo "✓ все 4 аккаунта авторизованы"

# ── Исключения из графика ──
# Мастер | дата | с | до | причина
create_block() {
  local master_id="$1" date="$2" from="$3" to="$4" reason="$5"
  local resp
  resp=$(curl -s -w "\n%{http_code}" -X POST "$API/admin/blocks" \
    -H "Authorization: Bearer $ADMIN" -H "Content-Type: application/json" \
    -d "{\"master_id\":$master_id,\"start_time\":\"${date}T${from}:00\",\"end_time\":\"${date}T${to}:00\",\"reason\":\"$reason\"}")
  local code=$(echo "$resp" | tail -1)
  if [ "$code" = "201" ]; then
    echo "  ✓ исключение: $reason — $date $from–$to"
  else
    echo "  ✗ исключение «$reason» → HTTP $code: $(echo "$resp" | head -1 | cut -c1-120)"
  fi
}

echo ""
echo "Исключения:"
create_block 1 "2026-10-01" "13:00" "14:00" "обед"
create_block 2 "2026-10-02" "15:00" "17:00" "личное время"
create_block 3 "2026-10-03" "00:00" "23:59" "выходной"

# ── Записи ──
# Клиент | услуга | мастер | дата | время | токен
create_booking() {
  local svc="$1" master="$2" date="$3" time="$4" token="$5" dur="$6"
  local h="${time%%:*}" m="${time##*:}"
  local total=$((10#$h * 60 + 10#$m + dur))
  local eh=$((total / 60)) em=$((total % 60))
  local end_time
  if [ "$eh" -ge 24 ]; then
    end_time="00:$((eh - 24)):$(printf %02d $em)"
  else
    end_time="$(printf %02d $eh):$(printf %02d $em)"
  fi
  local resp
  resp=$(curl -s -w "\n%{http_code}" -X POST "$API/bookings" \
    -H "Authorization: Bearer $token" -H "Content-Type: application/json" \
    -d "{\"serviceId\":$svc,\"masterId\":$master,\"start\":\"${date}T${time}:00\",\"end\":\"${date}T${end_time}:00\"}")
  local code=$(echo "$resp" | tail -1)
  if [ "$code" = "201" ]; then
    echo "  ✓ запись создана: $date $time МСК"
  else
    echo "  ✗ запись $date $time → HTTP $code: $(echo "$resp" | head -1 | cut -c1-140)"
  fi
}

echo ""
echo "Записи:"
# Ирина · Маникюр с покрытием (90 мин) · Анна · среда 7 октября 10:00
create_booking 1 1 "2026-10-07" "10:00" "$IRINA" 90
# Ольга · Ламинирование бровей (60 мин) · Марина · четверг 1 октября 12:00
create_booking 6 2 "2026-10-01" "12:00" "$OLGA" 60
# Дарья · Наращивание ногтя (150 мин) · Елена · вторник 6 октября 14:00
create_booking 3 3 "2026-10-06" "14:00" "$DARYA" 150

echo ""
echo "Готово."
