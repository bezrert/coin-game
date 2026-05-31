/**
 * Анимация подброса монеты во время ожидания VRF: монета подлетает в воздух и
 * вращается вокруг горизонтальной оси, показывая обе стороны (орёл / решка).
 * Чисто презентационный, без состояния — стили в globals.css (.coin-scene и др.).
 */
export function CoinToss() {
  return (
    <div className="coin-scene" aria-hidden>
      <div className="coin-lift">
        <div className="coin3d">
          <div className="coin-face coin-heads">О</div>
          <div className="coin-face coin-tails">Р</div>
        </div>
      </div>
    </div>
  );
}
