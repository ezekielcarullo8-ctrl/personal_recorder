(() => {
  const $ = (s) => document.querySelector(s),
    K = "student_ledger_data",
    KS = "student_ledger_settings";
  const ld = (k, d) => {
    try {
      const v = JSON.parse(localStorage.getItem(k));
      return v ?? d;
    } catch {
      return d;
    }
  };
  let tx = ld(K, []);
  if (!Array.isArray(tx)) tx = [];
  let S = Object.assign(
    { theme: "dark", priv: 0, goal: 0, limit: 0, bk: null },
    ld(KS, {}),
  );
  let per = "all",
    ft = "all",
    tab = "home",
    ovs = [],
    eid = null,
    et = "Savings",
    snap = null,
    cfn = null,
    tt;
  const save = () => {
    try {
      localStorage.setItem(K, JSON.stringify(tx));
      localStorage.setItem(KS, JSON.stringify(S));
    } catch {
      toast("Storage is full or blocked", 1);
    }
  };
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const peso = (n) =>
    "₱" +
    (Number(n) || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const day = (d) => {
    const x = new Date(d);
    return new Date(x - x.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
  };
  const today = () => day(new Date()),
    isS = (t) => t.type === "Savings";
  const sum = (a) => a.reduce((s, t) => s + (+t.amount || 0), 0);
  function fd(s) {
    if (s === today()) return "Today";
    const y = new Date();
    y.setDate(y.getDate() - 1);
    if (s === day(y)) return "Yesterday";
    const d = new Date(s + "T00:00");
    return isNaN(d)
      ? s
      : d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
  }
  function inPer(t, p) {
    if (p === "all") return true;
    let d = new Date();
    if (p === "week") {
      d.setDate(d.getDate() - d.getDay());
      return t.date >= day(d) && t.date <= today();
    }
    return t.date.startsWith(today().slice(0, p === "month" ? 7 : 4));
  }
  const row = (t) =>
    `<div class="li ${isS(t) ? "" : "ex"}" data-a="edit" data-v="${esc(t.id)}" role="button" tabindex="0"><div class="lic">${isS(t) ? "📥" : "💸"}</div><div class="ld"><div class="lt">${isS(t) ? esc(t.note || "Savings") : esc(t.recipient || "Money sent")}</div><div class="lm">${isS(t) ? "Savings" : esc(t.address || "")} · ${fd(t.date)}${t.note ? " · " + esc(t.note) : ""}</div></div><div class="la amt ${isS(t) ? "in" : "out"}">${isS(t) ? "+" : "-"}${peso(t.amount)}</div></div>`;
  const sorted = (a) =>
    [...a].sort(
      (x, y) =>
        y.date.localeCompare(x.date) ||
        String(y.id).localeCompare(String(x.id)),
    );
  function render() {
    const sv = sum(tx.filter(isS)),
      sn = sum(tx.filter((t) => !isS(t))),
      bal = sv - sn;
    $("#bal").textContent = peso(bal);
    $("#bal").className = "bv amt " + (bal < 0 ? "out" : "");
    $("#pIn").textContent = "+" + peso(sv);
    $("#pOut").textContent = "-" + peso(sn);
    $("#rl").innerHTML = [
      ...new Set(tx.map((t) => t.recipient).filter((x) => x && x !== "—")),
    ]
      .map((x) => `<option value="${esc(x)}">`)
      .join("");
    $("#al").innerHTML = [
      ...new Set(tx.map((t) => t.address).filter((x) => x && x !== "—")),
    ]
      .map((x) => `<option value="${esc(x)}">`)
      .join("");
    logs();
    monthChart();
    $("#lbk").textContent = S.bk
      ? "Last backup: " + new Date(S.bk).toLocaleString()
      : "No backup yet";
  }
  function logs() {
    const q = $("#q").value.toLowerCase().trim(),
      d = $("#fD").value;
    const r = sorted(tx).filter(
      (t) =>
        (ft === "all" || t.type === ft) &&
        (!d || t.date === d) &&
        (!q ||
          [t.recipient, t.address, t.note, t.amount, t.date]
            .join(" ")
            .toLowerCase()
            .includes(q)),
    );
    $("#rc").textContent = r.length + (r.length === 1 ? " entry" : " entries");
    $("#rt").textContent = peso(
      sum(r.filter(isS)) - sum(r.filter((t) => !isS(t))),
    );
    let h = "",
      last = "";
    r.forEach((t) => {
      if (t.date !== last) {
        last = t.date;
        const g = r.filter((x) => x.date === last);
        h += `<div class="gh"><span>${fd(last)}</span><span class="amt">${peso(sum(g.filter(isS)) - sum(g.filter((x) => !isS(x))))}</span></div>`;
      }
      h += row(t);
    });
    $("#list").innerHTML =
      h || '<div class="emp"><b>🔎</b>No matching entries.</div>';
  }
  function monthChart() {
    const now = new Date(),
      monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
      }),
      keys = dates.map(day),
      current = tx.filter((t) => keys.includes(t.date)),
      saved = sum(current.filter(isS)),
      sent = sum(current.filter((t) => !isS(t))),
      mx = Math.max(
        1,
        ...dates.flatMap((d) => {
          const k = day(d),
            a = current.filter((t) => t.date === k);
          return [sum(a.filter(isS)), sum(a.filter((t) => !isS(t)))];
        }),
      );
    const fmt = (d) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    $("#monthTitle").textContent =
      "This week · " + fmt(dates[0]) + "–" + fmt(dates[6]);
    $("#weekSaved").textContent = "Saved " + peso(saved);
    $("#weekSent").textContent = "Sent " + peso(sent);
    $("#bars").innerHTML = dates
      .map((d, i) => {
        const a = current.filter((t) => t.date === keys[i]),
          si = sum(a.filter(isS)),
          se = sum(a.filter((t) => !isS(t)));
        return `<div class="bc"><div class="bp"><i title="Saved ${peso(si)}" style="height:${si ? Math.max(2, (si / mx) * 100) : 0}%"></i><i title="Sent ${peso(se)}" style="height:${se ? Math.max(2, (se / mx) * 100) : 0}%"></i></div><span>${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}</span></div>`;
      })
      .join("");
  }
  function show(t) {
    tab = t;
    document
      .querySelectorAll(".tab")
      .forEach((e) => e.classList.toggle("on", e.id === "t-" + t));
    document
      .querySelectorAll(".ni")
      .forEach((e) => e.classList.toggle("on", e.dataset.v === t));
    window.scrollTo(0, 0);
    if (t === "logs") logs();
  }
  function go(t) {
    show(t);
  }
  function openOv(id) {
    ovs.push(id);
    $("#" + id).classList.add("on");
  }
  function back() {
    const id = ovs.pop();
    if (id) $("#" + id).classList.remove("on");
  }
  function toast(m, err, undo) {
    const t = $("#toast");
    t.className = "toast" + (err ? " e" : "");
    t.innerHTML =
      "<span>" +
      esc(m) +
      "</span>" +
      (undo ? '<button data-a="undo">UNDO</button>' : "");
    $("#tc").classList.add("on");
    clearTimeout(tt);
    tt = setTimeout(() => $("#tc").classList.remove("on"), undo ? 5000 : 2400);
  }
  const mark = () => (snap = JSON.stringify(tx));
  function ask(t, m, b, fn) {
    $("#cT").textContent = t;
    $("#cM").textContent = m;
    $("#cB").textContent = b;
    cfn = fn;
    openOv("cf");
  }
  const actions = {
    theme() {
      S.theme = S.theme === "dark" ? "light" : "dark";
      save();
      theme();
    },
    async setPin() {
      const old = $("#pinCurrent").value,
        newPin = $("#pinNew").value,
        confirm = $("#pinConfirm").value;
      if (S.pinHash && !(await verifyPin(old)))
        return toast("Current PIN is incorrect", 1);
      if (!/^\d{4,8}$/.test(newPin))
        return toast("New PIN must be 4–8 digits", 1);
      if (newPin !== confirm) return toast("PINs do not match", 1);
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const hex = Array.from(salt, (x) => x.toString(16).padStart(2, "0")).join(
        "",
      );
      const hash = await hashPin(hex, newPin);
      if (!hash)
        return toast(
          "Secure PIN storage is unavailable in this browser context",
          1,
        );
      S.pinSalt = hex;
      S.pinHash = hash;
      save();
      $("#pinCurrent").value = $("#pinNew").value = $("#pinConfirm").value = "";
      $("#pinStatus").textContent = "PIN lock is enabled";
      toast("PIN saved");
    },
    async removePin() {
      if (!S.pinHash) return toast("No PIN is currently set", 1);
      if (!(await verifyPin($("#pinCurrent").value)))
        return toast("Enter the correct current PIN", 1);
      delete S.pinSalt;
      delete S.pinHash;
      save();
      $("#pinCurrent").value = "";
      $("#pinStatus").textContent = "No PIN set";
      toast("PIN removed");
    },
    priv() {
      S.priv = S.priv ? 0 : 1;
      save();
      document.body.classList.toggle("priv", !!S.priv);
    },
    tab(v) {
      go(v);
    },
    pinSettings() {
      openOv("pinSettings");
    },
    ft(v) {
      ft = v;
      document
        .querySelectorAll("#ft .chip")
        .forEach((c) => c.classList.toggle("on", c.dataset.v === v));
      logs();
    },
    chip(v, b) {
      const i = b.closest("form")?.elements.amount;
      if (i) i.value = ((+i.value || 0) + +v).toFixed(2).replace(/\.00$/, "");
    },
    edit(v) {
      const t = tx.find((x) => String(x.id) === v);
      if (!t) return;
      eid = v;
      etype(t.type);
      $("#eA").value = t.amount;
      $("#eR").value = t.recipient === "—" ? "" : t.recipient;
      $("#eAd").value = t.address === "—" ? "" : t.address;
      $("#eN").value = t.note || "";
      $("#eD").value = t.date;
      openOv("ed");
    },
    et(v) {
      etype(v);
    },
    esave() {
      const a = +$("#eA").value,
        d = $("#eD").value,
        t = tx.find((x) => String(x.id) === eid),
        r = $("#eR").value.trim(),
        ad = $("#eAd").value.trim();
      if (!t) return;
      if (!(a > 0) || !Number.isFinite(a) || !d)
        return toast("Enter a valid amount and date", 1);
      if (et !== "Savings" && (!r || !ad))
        return toast("Recipient and address are required", 1);
      mark();
      Object.assign(t, {
        type: et,
        amount: a,
        date: d,
        recipient: et === "Savings" ? "—" : r,
        address: et === "Savings" ? "—" : ad,
        note: $("#eN").value.trim(),
      });
      save();
      back();
      render();
      toast("Entry updated", 0, 1);
    },
    edel() {
      ask(
        "Delete this entry?",
        "You can undo right after deleting.",
        "Delete",
        () => {
          mark();
          tx = tx.filter((x) => String(x.id) !== eid);
          back();
          back();
          save();
          render();
          toast("Entry deleted", 0, 1);
        },
      );
    },
    cyes() {
      const f = cfn;
      cfn = null;
      if (f) f();
      else back();
    },
    undo() {
      if (!snap) return;
      tx = JSON.parse(snap);
      snap = null;
      save();
      render();
      toast("Undone");
    },
    back,
    async exp() {
      const ok = await dl(
        JSON.stringify(
          {
            app: "student-ledger",
            v: 2,
            at: new Date().toISOString(),
            transactions: tx,
            settings: S,
          },
          null,
          2,
        ),
        "student-ledger-backup-" + today() + ".json",
        "application/json",
      );
      if (!ok) return;
      S.bk = Date.now();
      save();
      render();
      toast("Backup exported");
    },
    async csv() {
      const q = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"',
        r = [
          ["Date", "Type", "Recipient", "Address", "Amount", "Note"]
            .map(q)
            .join(","),
        ].concat(
          sorted(tx).map((t) =>
            [t.date, t.type, t.recipient, t.address, t.amount, t.note]
              .map(q)
              .join(","),
          ),
        );
      const ok = await dl(
        "\ufeff" + r.join("\n"),
        "student-ledger-" + today() + ".csv",
        "text/csv",
      );
      if (ok) toast("Spreadsheet exported");
    },
    imp() {
      $("#imf").click();
    },
    rst() {
      ask(
        "Reset all data?",
        "This permanently deletes every entry. Export a backup first if you may need it.",
        "Reset",
        () => {
          mark();
          tx = [];
          save();
          back();
          render();
          toast("All data cleared", 0, 1);
        },
      );
    },
  };
  async function dl(text, name, mime) {
    const cap = window.Capacitor?.Plugins;
    try {
      // 1) Capacitor app: write a real file, then open the native share sheet
      if (cap?.Filesystem && cap?.Share) {
        const r = await cap.Filesystem.writeFile({
          path: name,
          data: text,
          directory: "CACHE",
          encoding: "utf8",
        });
        await cap.Share.share({
          title: name,
          url: r.uri,
          dialogTitle: "Save file",
        });
        return true;
      }
      // 2) Mobile browser / PWA: Web Share with a file
      const file = new File([text], name, { type: mime });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: name });
        return true;
      }
      // 3) Chromium desktop: real "Save as" dialog
      if (window.showSaveFilePicker) {
        const h = await showSaveFilePicker({ suggestedName: name });
        const w = await h.createWritable();
        await w.write(file);
        await w.close();
        return true;
      }
    } catch (e) {
      if (e?.name === "AbortError" || /cancel/i.test(e?.message || ""))
        return false;
      console.warn("Native save failed, using fallback", e);
    }
    // 4) Fallback: classic download link
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: mime }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return true;
  }
  function etype(v) {
    et = v;
    $("#et-S").classList.toggle("on", v === "Savings");
    $("#et-M").classList.toggle("on", v !== "Savings");
    $("#eRg").classList.toggle("hid", v === "Savings");
    $("#eAg").classList.toggle("hid", v === "Savings");
    $("#eNg").classList.remove("hid");
  }
  function theme() {
    document.documentElement.dataset.theme = S.theme;
    $("#thB").textContent = S.theme === "dark" ? "🌙" : "☀️";
    $("#themeMeta").content = S.theme === "dark" ? "#0f172a" : "#f1f5f9";
  }
  async function hashPin(salt, pin) {
    try {
      const bytes = new TextEncoder().encode(salt + ":" + pin);
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest), (x) =>
        x.toString(16).padStart(2, "0"),
      ).join("");
    } catch {
      return null;
    }
  }
  async function verifyPin(pin) {
    if (!S.pinHash) return true;
    const h = await hashPin(S.pinSalt || "", pin);
    return !!h && h === S.pinHash;
  }
  function lockForPin() {
    if (!S.pinHash) return;
    $("#pinGate").style.display = "flex";
    document
      .querySelectorAll("main,.hd,.nav,.bal")
      .forEach((x) => x.setAttribute("aria-hidden", "true"));
    setTimeout(() => $("#unlockPin").focus(), 100);
  }
  function syncPinUi() {
    const enabled = !!S.pinHash;
    $("#pinStatus").textContent = enabled
      ? "PIN lock is enabled"
      : "No PIN set";
    if (enabled) lockForPin();
  }
  $("#unlockForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (await verifyPin($("#unlockPin").value)) {
      $("#pinGate").style.display = "none";
      document
        .querySelectorAll("main,.hd,.nav,.bal")
        .forEach((x) => x.removeAttribute("aria-hidden"));
      $("#unlockPin").value = "";
      $("#pinError").textContent = "";
    } else {
      $("#pinError").textContent = "Incorrect PIN. Try again.";
      $("#unlockPin").value = "";
      $("#unlockPin").focus();
    }
  });
  function handleBack() {
    if (ovs.length) {
      back();
      return;
    }
    if (tab !== "home") {
      show("home");
      return;
    }
    try {
      const app = window.Capacitor?.Plugins?.App;
      if (app?.exitApp) app.exitApp();
    } catch {}
  }
  try {
    const app = window.Capacitor?.Plugins?.App;
    if (app?.addListener) {
      app.addListener("backButton", handleBack);
      app.addListener("appStateChange", (state) => {
        if (state?.isActive && S.pinHash) lockForPin();
      });
    }
  } catch {}
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && S.pinHash) lockForPin();
  });
  history.replaceState({ ledger: true }, "");
  history.pushState({ ledger: true }, "");
  addEventListener("popstate", () => {
    handleBack();
    history.pushState({ ledger: true }, "");
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-a]");
    if (b && actions[b.dataset.a]) actions[b.dataset.a](b.dataset.v, b);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") back();
    if (
      (e.key === "Enter" || e.key === " ") &&
      e.target.matches(".li[role=button]")
    ) {
      e.preventDefault();
      actions.edit(e.target.dataset.v);
    }
  });
  ["q", "fD"].forEach((i) => $("#" + i).addEventListener("input", logs));
  document.addEventListener("submit", (e) => {
    const f = e.target.closest("form[data-f]");
    if (!f) return;
    e.preventDefault();
    if (!f.reportValidity()) return;
    const type = f.dataset.f,
      a = +f.elements.amount.value,
      s = type === "Savings",
      d = f.elements.date.value,
      r = s ? "—" : f.elements.recipient.value.trim(),
      ad = s ? "—" : f.elements.address.value.trim();
    if (!(a > 0) || !Number.isFinite(a) || !d || (!s && (!r || !ad)))
      return toast("Complete all required fields with a valid amount", 1);
    const t = {
      id: "tx_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      date: d,
      type,
      recipient: r,
      address: ad,
      amount: a,
      note: f.elements.note.value.trim(),
    };
    const add = () => {
      mark();
      tx.unshift(t);
      save();
      f.reset();
      f.elements.date.value = today();
      render();
      toast(s ? "Savings recorded" : "Money sent recorded", 0, 1);
    };
    const bal = sum(tx.filter(isS)) - sum(tx.filter((x) => !isS(x)));
    if (!s && a > bal)
      ask(
        "Balance will go negative",
        "You are sending " +
          peso(a) +
          " but your balance is " +
          peso(bal) +
          ". Record it anyway?",
        "Record",
        () => {
          back();
          add();
        },
      );
    else add();
  });
  $("#imf").addEventListener("change", (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const j = JSON.parse(r.result),
          a = Array.isArray(j) ? j : j.transactions;
        if (!Array.isArray(a)) throw Error();
        const ok = a
          .filter(
            (t) =>
              t &&
              /^\d{4}-\d{2}-\d{2}$/.test(String(t.date)) &&
              Number.isFinite(+t.amount) &&
              +t.amount > 0 &&
              (t.type === "Savings" || t.type === "Money Sent") &&
              (t.type === "Savings" ||
                (String(t.recipient || "").trim() &&
                  String(t.address || "").trim())),
          )
          .map((t, i) => ({
            id: String(t.id || "tx_" + Date.now() + "_" + i),
            date: String(t.date),
            type: t.type,
            recipient: t.recipient || "—",
            address: t.address || "—",
            amount: +t.amount,
            note: String(t.note || "").slice(0, 60),
          }));
        ask(
          "Replace current data?",
          "Found " +
            ok.length +
            " valid entries. This replaces your current ledger.",
          "Restore",
          () => {
            mark();
            tx = ok;
            save();
            back();
            render();
            toast("Backup restored", 0, 1);
          },
        );
      } catch {
        toast("That file is not a valid backup", 1);
      }
    };
    r.readAsText(f);
  });
  document
    .querySelectorAll("form[data-f]")
    .forEach((f) => (f.elements.date.value = today()));
  theme();
  document.body.classList.toggle("priv", !!S.priv);
  render();
  syncPinUi();
})();
