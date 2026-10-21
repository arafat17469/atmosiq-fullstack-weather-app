export default function AboutPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">About AtmosIQ</h1>

      <div className="card">
        <p className="text-sm text-slate-700">
          AtmosIQ is a full-stack weather application with location search, current conditions,
          forecasts, hourly trends, an interactive map, side-by-side place comparison, trip
          insights, and saved weather requests with export. Weather data is provided by{" "}
          <a className="text-blue-700 underline" href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>{" "}
          and maps by OpenStreetMap.
        </p>
      </div>

      <div className="card">
        <h2 className="text-base font-semibold text-slate-800">Developer</h2>
        <p className="mt-2 text-sm text-slate-700">Developed by Arafat Rahman.</p>
        <ul className="mt-2 space-y-1 text-sm">
          <li>
            Portfolio:{" "}
            <a className="text-blue-700 underline" href="https://arafat174.vercel.app" target="_blank" rel="noreferrer">
              arafat174.vercel.app
            </a>
          </li>
          <li>
            GitHub:{" "}
            <a className="text-blue-700 underline" href="https://github.com/arafat17469" target="_blank" rel="noreferrer">
              github.com/arafat17469
            </a>
          </li>
          <li>
            Kaggle:{" "}
            <a className="text-blue-700 underline" href="https://kaggle.com/arafat1746" target="_blank" rel="noreferrer">
              kaggle.com/arafat1746
            </a>
          </li>
        </ul>
      </div>

      <div className="card">
        <h2 className="text-base font-semibold text-slate-800">Assessment</h2>
        <p className="mt-2 text-sm text-slate-700">
          Built for the AI Engineer Internship Technical Assessment at PM Accelerator. PM
          Accelerator (Product Manager Accelerator) supports people developing product management
          careers, from entry-level roles to product leadership. Its programs include practical
          AI product development, interview preparation, and leadership training.{" "}
          <a
            className="text-blue-700 underline"
            href="https://www.linkedin.com/school/pmaccelerator/"
            target="_blank"
            rel="noreferrer"
          >
            Product Manager Accelerator on LinkedIn
          </a>
        </p>
      </div>
    </div>
  );
}
