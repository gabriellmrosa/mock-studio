import { seekVideo } from "./video-seek";

/**
 * Um `<video>` de mentira: guarda o instante pedido e só dispara `seeked`
 * quando o teste manda (`answer`), como um decodificador lento ou suspenso.
 */
class FakeVideo extends EventTarget {
  seeking = false;
  seeks: number[] = [];
  private time = 0;

  get currentTime() {
    return this.time;
  }

  set currentTime(value: number) {
    this.time = value;
    this.seeking = true;
    this.seeks.push(value);
  }

  answer() {
    this.seeking = false;
    this.dispatchEvent(new Event("seeked"));
  }
}

class FakePage extends EventTarget {
  visibilityState: DocumentVisibilityState = "visible";

  setVisibility(state: DocumentVisibilityState) {
    this.visibilityState = state;
    this.dispatchEvent(new Event("visibilitychange"));
  }
}

function setup() {
  const video = new FakeVideo();
  const page = new FakePage();
  const options = {
    attempts: 3,
    page: page as unknown as Document,
    timeoutMs: 100,
  };

  return {
    options,
    page,
    seek: (seconds: number) =>
      seekVideo(video as unknown as HTMLVideoElement, seconds, options),
    video,
  };
}

/** Deixa as promises pendentes andarem entre os passos do relógio falso. */
async function advance(ms: number) {
  await jest.advanceTimersByTimeAsync(ms);
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("seekVideo", () => {
  it("resolves when the video answers the seek", async () => {
    const { seek, video } = setup();
    const done = seek(2);

    video.answer();

    await expect(done).resolves.toBeUndefined();
    expect(video.seeks).toEqual([2]);
  });

  it("does not seek when the video is already there", async () => {
    const { seek, video } = setup();
    video.currentTime = 1;
    video.answer();
    video.seeks = [];

    await expect(seek(1)).resolves.toBeUndefined();
    expect(video.seeks).toEqual([]);
  });

  it("tries again after a seek that does not answer in time", async () => {
    const { seek, video } = setup();
    const done = seek(2);

    // A primeira tentativa estoura o limite (o decodificador ligando).
    await advance(100);
    expect(video.seeks).toEqual([2, 2]);

    video.answer();

    await expect(done).resolves.toBeUndefined();
  });

  it("fails after every attempt times out with the page visible", async () => {
    const { seek, video } = setup();
    const done = seek(2);
    const failed = expect(done).rejects.toThrow("não respondeu ao seek");

    await advance(300);

    await failed;
    expect(video.seeks).toEqual([2, 2, 2]);
  });

  it("waits for a hidden page to come back without spending attempts", async () => {
    const { options, page, seek, video } = setup();
    options.attempts = 1;
    page.setVisibility("hidden");
    const done = seek(2);

    // Escondida, o limite estoura várias vezes e nada falha: só espera.
    await advance(1000);
    expect(video.seeks).toEqual([2]);

    page.setVisibility("visible");
    await advance(0);
    expect(video.seeks).toEqual([2, 2]);

    video.answer();

    await expect(done).resolves.toBeUndefined();
  });

  it("takes a late answer to an earlier attempt", async () => {
    const { seek, video } = setup();
    const done = seek(2);

    await advance(100);
    // O seek anterior chega durante a nova tentativa: o quadro é o mesmo.
    video.answer();

    await expect(done).resolves.toBeUndefined();
    expect(video.seeks).toEqual([2, 2]);
  });
});
