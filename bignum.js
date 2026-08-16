class BigNum {
    static MAX_SAFE = Number.MAX_SAFE_INTEGER; 
    static MAX_EX = Number.MAX_SAFE_INTEGER; 

    constructor(mt = 0, ex = 0) {
        this.isInfinity = false;
        if (typeof mt === "string") {
            const parts = mt.toLowerCase().split("e");
            this.mt = parseFloat(parts[0]) || 0;
            this.ex = parts[1] ? parseInt(parts[1], 10) : 0;
        } else if (mt instanceof BigNum) {
            this.mt = mt.mt;
            this.ex = mt.ex;
            this.isInfinity = mt.isInfinity;
            return;
        } else {
            this.mt = mt;
            this.ex = ex;
        }
        this.normalize();
    }

    normalize() {
        if (this.isInfinity) return;
        if (this.mt === 0) { this.ex = 0; return; }
        
        // 【修正】ex === 0（生数値）のときは、toExponential を使って安全に分離する
        if (this.ex === 0) {
            if (!isFinite(this.mt)) {
                this.isInfinity = true;
                this.mt = Math.sign(this.mt) * Infinity;
                this.ex = BigNum.MAX_EX;
                return;
            }
            // 1e-7 ~ 1e7 の範囲外の時に指数表記に変換して mt と ex にばらす
            if (Math.abs(this.mt) >= 1e7 || Math.abs(this.mt) < 1e-7) {
                const parts = this.mt.toExponential().toLowerCase().split("e");
                this.mt = parseFloat(parts[0]);
                this.ex = parseInt(parts[1], 10);
            }
        } else {
            // すでに mt と ex が分かれている場合の微調整
            while (Math.abs(this.mt) >= 10) { this.mt /= 10; this.ex += 1; }
            while (Math.abs(this.mt) < 1 && this.mt !== 0) { this.mt *= 10; this.ex -= 1; }
        }

        // 小さい乗数のときは扱いやすいように ex=0 に戻す処理
        if (this.ex > 0 && this.ex <= 15) { 
            this.mt = this.mt * Math.pow(10, this.ex);
            this.ex = 0;
        }
        if (this.ex < 0 && this.ex >= -15) {
            this.mt = this.mt / Math.pow(10, -this.ex);
            this.ex = 0;
        }

        // 溢れチェック (MAX_EX は 9007199254740991 なので、これを超えるかチェック)
        if (this.ex > BigNum.MAX_EX) {
            this.isInfinity = true;
            this.mt = Math.sign(this.mt) * Infinity;
            this.ex = BigNum.MAX_EX;
        }
    }

    // 加算（足し算）
    add(other) {
        const o = new BigNum(other);
        if (this.isInfinity || o.isInfinity) return new BigNum(Infinity);

        if (this.ex === 0 && o.ex === 0) {
            const result = this.mt + o.mt;
            if (Math.abs(result) <= BigNum.MAX_SAFE) return new BigNum(result, 0);
        }

        const diff = this.ex - o.ex;
        if (diff >= 16) return new BigNum(this);
        if (diff <= -16) return new BigNum(o);

        let newMt;
        if (diff >= 0) {
            newMt = this.mt + (o.mt / Math.pow(10, diff));
            return new BigNum(newMt, this.ex);
        } else {
            newMt = (this.mt / Math.pow(10, -diff)) + o.mt;
            return new BigNum(newMt, o.ex);
        }
    }

    // 減算（引き算）
    sub(other) {
        const o = new BigNum(other);
        if (this.isInfinity || o.isInfinity) return new BigNum(Infinity);
        if (this.ex === 0 && o.ex === 0) {
            const result = this.mt - o.mt;
            if (Math.abs(result) <= BigNum.MAX_SAFE) return new BigNum(result, 0);
        }
        const diff = this.ex - o.ex;
        if (diff >= 16) return new BigNum(this);
        if (diff <= -16) return new BigNum(new BigNum(-o.mt, o.ex));
        let newMt;
        if (diff >= 0) {
            newMt = this.mt - (o.mt / Math.pow(10, diff));
            return new BigNum(newMt, this.ex);
        } else {
            newMt = (this.mt / Math.pow(10, -diff)) - o.mt;
            return new BigNum(newMt, o.ex);
        }
    }

    // 乗算（掛け算）
    mul(other) {
        const o = new BigNum(other);
        if (this.isInfinity || o.isInfinity) return new BigNum(Infinity);
        if (this.mt === 0 || o.mt === 0) return new BigNum(0);

        if (this.ex === 0 && o.ex === 0) {
            const result = this.mt * o.mt;
            if (Math.abs(result) <= BigNum.MAX_SAFE) return new BigNum(result, 0);
        }

        const tMt = this.ex === 0 ? this.mt / Math.pow(10, Math.floor(Math.log10(Math.abs(this.mt)))) : this.mt;
        const tEx = this.ex === 0 ? Math.floor(Math.log10(Math.abs(this.mt))) : this.ex;
        const oMt = o.ex === 0 ? o.mt / Math.pow(10, Math.floor(Math.log10(Math.abs(o.mt)))) : o.mt;
        const oEx = o.ex === 0 ? Math.floor(Math.log10(Math.abs(o.mt))) : o.ex;

        return new BigNum(tMt * oMt, tEx + oEx);
    }

    // 除算（割り算）
    div(other) {
        const o = new BigNum(other);
        if (this.isInfinity) return new BigNum(Infinity);
        if (o.isInfinity) return new BigNum(0);
        if (o.mt === 0) return new BigNum(Infinity);
        if (this.ex === 0 && o.ex === 0) {
            const result = this.mt / o.mt;
            if (Math.abs(result) <= BigNum.MAX_SAFE) return new BigNum(result, 0);
        }
        const tMt = this.ex === 0 ? this.mt / Math.pow(10, Math.floor(Math.log10(Math.abs(this.mt)))) : this.mt;
        const tEx = this.ex === 0 ? Math.floor(Math.log10(Math.abs(this.mt))) : this.ex;
        const oMt = o.ex === 0 ? o.mt / Math.pow(10, Math.floor(Math.log10(Math.abs(o.mt)))) : o.mt;
        const oEx = o.ex === 0 ? Math.floor(Math.log10(Math.abs(o.mt))) : o.ex;
        return new BigNum(tMt / oMt, tEx - oEx);
    }

    // 比較
    compareTo(other) {
        const o = new BigNum(other);

        if (this.isInfinity || o.isInfinity) {
            if (this.isInfinity && o.isInfinity) {
                return Math.sign(this.mt) - Math.sign(o.mt);
            }
            if (this.isInfinity) return Math.sign(this.mt);
            return -Math.sign(o.mt);
        }

        if (this.mt === 0 && o.mt === 0) return 0;
        if (this.mt === 0) return o.mt > 0 ? -1 : 1;
        if (o.mt === 0) return this.mt > 0 ? 1 : -1;

        const thisSign = Math.sign(this.mt);
        const otherSign = Math.sign(o.mt);

        if (thisSign !== otherSign) {
            return thisSign - otherSign;
        }

        // 両方正
        if (thisSign > 0) {
            if (this.ex !== o.ex) return this.ex > o.ex ? 1 : -1;
            return this.mt > o.mt ? 1 : this.mt < o.mt ? -1 : 0;
        }

        // 両方負：絶対値が大きいほど小さい
        if (this.ex !== o.ex) return this.ex < o.ex ? 1 : -1;
        return this.mt > o.mt ? -1 : this.mt < o.mt ? 1 : 0;
    }

    min(other) { return this.compareTo(other) <= 0 ? this : new BigNum(other); }
    max(other) { return this.compareTo(other) >= 0 ? this : new BigNum(other); }

    round() {
        if (this.isInfinity) return new BigNum(this);
        if (this.ex === 0) {return new BigNum(Math.round(this.mt));}

        if (this.ex < 0) {
            const abs = Math.abs(this.mt) * Math.pow(10, this.ex);
            if (abs < 0.5) {return new BigNum(0);}
            return this.mt > 0 ? new BigNum(1) : new BigNum(-1);
        }

        return new BigNum(this);
    }

    // 累乗
    pow(power) {
        if (this.isInfinity) return new BigNum(Infinity);
        if (power === 0) return new BigNum(1);
        if (this.mt === 0) return new BigNum(0);

        // 常用対数 (ld) を利用して、(mt * 10^ex)^power を計算する
        // 公式：log10(X^P) = P * log10(X)
        const totalLog = power * this.ld();
        
        if (totalLog === Infinity) {
            return new BigNum(Infinity);
        }
        if (totalLog === -Infinity) {
            return new BigNum(0);
        }

        // 整数部分を新しい指数 (ex) に、小数部分を新しい仮数 (mt) に変換する
        const newEx = Math.floor(totalLog);
        const newMt = Math.pow(10, totalLog - newEx); // 指数(底)は常に0以上1未満になるため、絶対に10未満に収まる（溢れない）

        return new BigNum(newMt, newEx);
    }

    // 常用対数
    ld() {
        if (this.isInfinity) return Infinity;
        if (this.mt <= 0) return -Infinity;
        return this.ex === 0 ? Math.log10(this.mt) : Math.log10(this.mt) + this.ex;
    }


    // 任意の底の対数
    log(base) {
        if (this.isInfinity) return Infinity;
        if (this.mt <= 0) return -Infinity;
        if (base <= 0 || base === 1) return NaN;
        return this.ld() / Math.log10(base);
    }

    toString() {
        if (this.isInfinity) return "Infinity";
        if (this.ex === 0) return Math.floor(this.mt).toString();
        return `${this.mt.toFixed(6)}e${this.ex}`;
    }

    toNumber() {
        if (this.isInfinity) return Infinity;
        return this.mt * Math.pow(10, this.ex);
    }
}


// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
const units = ['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc','Ud','Dd','Td','Qad','Qid','Sxd','Spd','Ocd','Nod','Vg','Uvg','Dvg','Tvg','Qag','Qig','Sxg','Spg'];
// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 

window.notatBn = function(bn) {
    if (!(bn instanceof BigNum)) {
        bn = new BigNum(bn);
    }

    if (bn.isInfinity) return "Infinity";
    const sig = bn.mt < 0 ? "-" : "";
    const absMt = Math.abs(bn.mt);
    const absEx = bn.ex;

    // 1000万未満の通常数値はそのまま表示
    if (absEx === 0 && absMt < 1e7) {
        return sig + String(Math.floor(absMt));
    }
    
    // 【修正】ex=0 の場合でも、mtの大きさから正しい指数(実質的なex)を計算する
    const realEx = absEx === 0 ? Math.floor(Math.log10(absMt)) : absEx;
    let tier = Math.floor(realEx / 3);
    const remainder = realEx % 3;
    
    // 表示用の数値を算出
    let scaledMt = (absEx === 0) 
        ? absMt / Math.pow(10, tier * 3) 
        : absMt * Math.pow(10, remainder);

    // 【修正】誤差で上限を超えた場合は while で確実に繰り上げる
    while (scaledMt >= Math.pow(10, 3)) {
        scaledMt /= Math.pow(10, 3);
        tier += 1;
    }

    const exp = tier * 3;

    // 単位配列の範囲内かチェック
    if (units[tier] !== undefined) {
        return sig + scaledMt.toFixed(2) + units[tier];
    } else if (exp < 1e7) {
        return sig + scaledMt.toFixed(2) + "e" + exp;
    } else {
        const len = Math.floor(Math.log10(exp) / 3);
        return sig + scaledMt.toFixed(2) + "e" + (exp / (1e3 ** len)).toFixed(3) + "e" + (len*3);
    }
};