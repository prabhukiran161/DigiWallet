"use client";
import { Check } from "lucide-react";
import { BrandLogo } from "./components/brand-logo";
import { Auth } from "./components/auth";
import { Modal } from "./components/primitives";
import { TransactionForm } from "./components/transaction-form";
import { AccountForm } from "./components/account-form";
import { MonthPicker } from "./components/layout/month-picker";
import { BottomNav } from "./components/layout/bottom-nav";
import { AppHeader } from "./components/layout/app-header";
import {
  useWalletApp,
  HomeView,
  AccountsView,
  ActivityView,
  BudgetView,
  SettingsView,
} from "./views";
import { appStyleScopes } from "./styles/scopes";
import { InstitutionCatalog } from "./components/institution-brand";
import transactionStyles from "./components/transaction-form/transaction-form.module.css";

export default function Home() {
  const app = useWalletApp();

  if (app.loading) {
    return (
      <main className={`phone-shell loading ${appStyleScopes}`} role="status">
        <span className="brand-mark">
          <BrandLogo variant="white" size={58} />
        </span>
        <h2>Opening your wallet</h2>
        <div className="loading-bar" />
      </main>
    );
  }

  if (app.error) {
    return (
      <main className={`phone-shell loading ${appStyleScopes}`}>
        <p role="alert">{app.error}</p>
        <button className="primary" onClick={() => void app.load()}>
          Try again
        </button>
      </main>
    );
  }

  if (!app.user) return <Auth onDone={() => void app.load()} />;
  if (!app.wallet) return null;

  const monthControl = (
    <MonthPicker
      month={app.month}
      onChangeMonth={app.changeMonth}
      onSetMonth={(m) => {
        app.setMonth(m);
        app.setDay("");
      }}
    />
  );

  return (
    <div className={`phone-shell ${appStyleScopes}`}>
      <InstitutionCatalog.Provider value={app.institutions}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <AppHeader
        view={app.view}
        userName={app.user.name}
        onNavigate={app.navigate}
        onAddAccount={() => app.setModal("account")}
      />

      <main id="main" className="mobile-content">
        {app.view === "Home" && (
          <HomeView
            wallet={app.wallet}
            month={app.month}
            hidden={app.hidden}
            onToggleHidden={() => app.setHidden(!app.hidden)}
            monthControl={monthControl}
            save={app.save}
            onNavigate={app.navigate}
            onRecord={app.record}
            onOpenAddAccount={() => app.setModal("account")}
            onFilterAccounts={(f) => app.setFilter(f)}
          />
        )}

        {app.view === "Accounts" && (
          <AccountsView
            wallet={app.wallet}
            month={app.month}
            filter={app.filter}
            onSelectFilter={app.setFilter}
            save={app.save}
            onRecord={app.record}
            onOpenAddAccount={() => app.setModal("account")}
          />
        )}

        {app.view === "Activity" && (
          <ActivityView
            wallet={app.wallet}
            month={app.month}
            day={app.day}
            monthControl={monthControl}
            onSetDay={app.setDay}
          />
        )}

        {app.view === "Budget" && (
          <BudgetView
            wallet={app.wallet}
            month={app.month}
            monthControl={monthControl}
            save={app.save}
            onNavigate={app.navigate}
            onSetDay={app.setDay}
          />
        )}

        {app.view === "Settings" && (
          <SettingsView
            user={app.user}
            wallet={app.wallet}
            month={app.month}
            save={app.save}
            onSignOut={() => void app.signOut()}
          />
        )}
      </main>

      <BottomNav
        view={app.view}
        onNavigate={app.navigate}
        onRecord={() => app.record()}
      />

      {app.notice && (
        <div role="status" className="toast">
          <Check size={17} />
          {app.notice}
        </div>
      )}

      {app.modal && (
        <Modal
          className={app.modal === "transaction" ? transactionStyles.dialog : undefined}
          title={app.modal === "transaction" ? "New transaction" : "Add account"}
          onClose={() => app.setModal("")}
        >
          {app.modal === "transaction" ? (
            <TransactionForm
              wallet={app.wallet}
              save={app.save}
              initialType={app.entry}
              onDone={() => app.setModal("")}
            />
          ) : (
            <AccountForm
              save={app.save}
              onDone={() => app.setModal("")}
            />
          )}
        </Modal>
      )}
      </InstitutionCatalog.Provider>
    </div>
  );
}
