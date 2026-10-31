/**
 * Session applicative en mémoire.
 *
 * `AuthService.logout()` appelle `stopSession()` après avoir vidé le stockage
 * local : le gestionnaire coupe les minuteurs encore actifs et oublie
 * l'identifiant de session, pour qu'aucun rappel ne parte après déconnexion.
 */
type Timer = ReturnType<typeof setInterval> | ReturnType<typeof setTimeout>;

class SessionManager {
  private sessionId: string | null = null;
  private timers = new Set<Timer>();

  /** Ouvre une session ; la session précédente est d'abord fermée. */
  startSession(sessionId: string): void {
    this.stopSession();
    this.sessionId = sessionId;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  isActive(): boolean {
    return this.sessionId !== null;
  }

  /** Enregistre un minuteur pour qu'il soit coupé à la déconnexion. */
  trackTimer(timer: Timer): Timer {
    this.timers.add(timer);
    return timer;
  }

  /** Coupe les minuteurs en attente et oublie la session courante. */
  stopSession(): void {
    this.timers.forEach((timer) => {
      clearInterval(timer);
      clearTimeout(timer);
    });
    this.timers.clear();
    this.sessionId = null;
  }
}

export const sessionManager = new SessionManager();
