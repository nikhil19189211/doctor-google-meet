import Image from "next/image";
import Link from "next/link";
import HomeHeader from "./components/HomeHeader";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-800 font-[family-name:var(--font-geist-sans)]">

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <span className="text-base font-bold text-gray-900 tracking-tight">Dr. Carter</span>
              <span className="hidden sm:block text-[10px] text-teal-600 font-medium -mt-0.5 uppercase tracking-widest">Cardiology & Heart Care</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#services" className="hover:text-teal-600 transition-colors">Services</a>
            <a href="#about" className="hover:text-teal-600 transition-colors">About</a>
            <a href="#testimonials" className="hover:text-teal-600 transition-colors">Patients</a>
            <a href="#contact" className="hover:text-teal-600 transition-colors">Contact</a>
          </nav>

          <HomeHeader />
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-900 via-teal-800 to-teal-700 text-white">
        {/* Background decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-600/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          {/* Text side */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-teal-600/40 border border-teal-400/30 text-teal-200 text-xs font-semibold uppercase tracking-widest rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-300 animate-pulse" />
              Board-Certified Cardiologist · 15+ Years
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-5 tracking-tight">
              Your Heart Health<br />
              <span className="text-teal-300">Is Our Priority</span>
            </h1>
            <p className="text-lg sm:text-xl text-teal-100/80 mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed">
              Expert cardiovascular care with compassion. Dr. Amelia Carter brings cutting-edge diagnostics and a patient-first approach to every consultation.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link href="/book" className="inline-flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-full px-8 py-3.5 text-base transition-all shadow-lg shadow-rose-900/30 hover:shadow-rose-900/50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Book Appointment
              </Link>
              <a href="#about" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-full px-8 py-3.5 text-base transition-all backdrop-blur-sm">
                Learn More
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </a>
            </div>

            {/* Trust badges */}
            <div className="mt-10 flex flex-wrap gap-4 justify-center lg:justify-start">
              {trustBadges.map((b) => (
                <div key={b.label} className="flex items-center gap-2 text-teal-100/70 text-sm">
                  <div className="w-7 h-7 rounded-full bg-teal-600/50 flex items-center justify-center">
                    {b.icon}
                  </div>
                  {b.label}
                </div>
              ))}
            </div>
          </div>

          {/* Doctor photo */}
          <div className="flex-shrink-0 relative">
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96">
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-400/40 to-rose-400/20 blur-xl scale-110" />
              <div className="relative w-full h-full rounded-full overflow-hidden ring-4 ring-white/20 shadow-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&q=80"
                  alt="Dr. Amelia Carter — Cardiologist"
                  fill
                  className="object-cover object-top"
                  priority
                />
              </div>
              {/* Floating badge */}
              <div className="absolute -bottom-4 -left-4 bg-white text-gray-900 rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-rose-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Patient Rating</p>
                  <p className="text-sm font-bold text-gray-900">4.9 / 5.0 ⭐</p>
                </div>
              </div>
              {/* Floating experience badge */}
              <div className="absolute -top-4 -right-4 bg-teal-600 text-white rounded-2xl px-4 py-3 shadow-xl">
                <p className="text-xs opacity-80">Experience</p>
                <p className="text-lg font-extrabold">15+ yrs</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Strip ── */}
      <section className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1">
              <p className="text-3xl font-extrabold text-teal-600">{stat.value}</p>
              <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Services Section ── */}
      <section id="services" className="py-20 sm:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-teal-600 font-semibold text-sm uppercase tracking-widest mb-2">What We Offer</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Comprehensive Cardiac Services</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
              From early detection to long-term management — personalised heart care at every stage.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service) => (
              <div key={service.title} className="group bg-white rounded-3xl p-7 flex flex-col gap-5 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-teal-100">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${service.color}`}>
                  {service.icon}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 text-base">{service.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{service.description}</p>
                </div>
                <div className="mt-auto pt-2">
                  <Link href="/book" className="text-sm font-semibold text-teal-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                    Book Now
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About + Image Section ── */}
      <section id="about" className="py-20 sm:py-28 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-16 items-center">
          {/* Images grid */}
          <div className="flex-shrink-0 relative w-full lg:w-[480px]">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative h-56 rounded-3xl overflow-hidden shadow-lg col-span-2">
                <Image
                  src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=900&q=80"
                  alt="Modern cardiac clinic"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="relative h-40 rounded-3xl overflow-hidden shadow-lg">
                <Image
                  src="https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=600&q=80"
                  alt="Heart monitoring equipment"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="relative h-40 rounded-3xl overflow-hidden shadow-lg">
                <Image
                  src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&q=80"
                  alt="Doctor consulting patient"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            {/* Award badge */}
            <div className="absolute -bottom-5 -right-5 bg-gradient-to-br from-teal-600 to-teal-700 text-white rounded-2xl p-4 shadow-xl">
              <p className="text-xs font-medium opacity-80">Awarded</p>
              <p className="text-sm font-bold leading-tight">Top Cardiologist<br />2024</p>
            </div>
          </div>

          {/* Text */}
          <div className="flex-1">
            <p className="text-teal-600 font-semibold text-sm uppercase tracking-widest mb-3">About the Doctor</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 leading-tight">
              Meet Dr. Amelia Carter, MD
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4 text-base">
              Dr. Amelia Carter is a board-certified cardiologist with over <strong>15 years</strong> of experience diagnosing and treating complex cardiovascular conditions at leading medical institutions across the country.
            </p>
            <p className="text-gray-600 leading-relaxed mb-8 text-base">
              She combines <strong>cutting-edge diagnostics</strong> with a deeply empathetic, patient-first approach — helping patients not just manage heart disease, but achieve lasting heart health and a better quality of life.
            </p>
            <div className="space-y-3 mb-8">
              {qualifications.map((q) => (
                <div key={q} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-gray-700 text-sm">{q}</p>
                </div>
              ))}
            </div>
            <Link href="/book" className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-full px-7 py-3 transition-all shadow-md shadow-teal-100">
              Schedule a Consultation
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 sm:py-24 bg-gradient-to-br from-teal-900 to-teal-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-teal-300 font-semibold text-sm uppercase tracking-widest mb-2">Simple Process</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Your Care Journey in 3 Steps</h2>
            <p className="text-teal-100/70 max-w-xl mx-auto text-lg">Getting expert cardiac care has never been easier.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden sm:block absolute top-10 left-1/4 right-1/4 h-0.5 bg-teal-600/50" />
            {steps.map((step, i) => (
              <div key={step.title} className="flex flex-col items-center text-center">
                <div className="relative w-20 h-20 rounded-full bg-teal-600/40 border-2 border-teal-500/50 flex items-center justify-center mb-5 shadow-lg">
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  {step.icon}
                </div>
                <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-teal-100/70 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="py-20 sm:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-teal-600 font-semibold text-sm uppercase tracking-widest mb-2">Patient Stories</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">What Our Patients Say</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-lg">Real outcomes from real patients — their stories inspire everything we do.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white rounded-3xl p-7 shadow-sm border border-gray-100 flex flex-col gap-5">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-teal-100 flex-shrink-0">
                    <Image src={t.image} alt={t.name} fill className="object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-16 sm:py-20 bg-gradient-to-r from-rose-500 to-rose-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight">
            Take the First Step Toward a Healthier Heart
          </h2>
          <p className="text-rose-100 text-lg mb-8 max-w-xl mx-auto">
            Don&apos;t wait for symptoms. Book a consultation today and let Dr. Carter create a care plan tailored to you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/book" className="inline-flex items-center justify-center gap-2 bg-white text-rose-600 font-bold rounded-full px-8 py-4 hover:bg-rose-50 transition-all shadow-lg text-base">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Book an Appointment
            </Link>
            <a href="tel:+15550123456" className="inline-flex items-center justify-center gap-2 bg-rose-600/50 border border-white/30 text-white font-semibold rounded-full px-8 py-4 hover:bg-rose-600/80 transition-all text-base">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Call Us Now
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="contact" className="bg-gray-900 text-gray-400 pt-14 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <span className="text-white font-bold text-lg">Dr. Amelia Carter, MD</span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs">
                Board-certified cardiologist providing expert, compassionate heart care. Serving patients with a commitment to excellence since 2009.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-widest">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                {["Book Appointment", "Patient Login", "Sign Up", "Dashboard"].map((item) => (
                  <li key={item}>
                    <Link href={`/${item.toLowerCase().replace(/ /g, "")}`} className="hover:text-white transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-widest">Contact</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="tel:+15550123456" className="flex items-center gap-2 hover:text-white transition-colors">
                    <svg className="w-4 h-4 text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    +1 (555) 012-3456
                  </a>
                </li>
                <li>
                  <a href="mailto:dr.carter@heartcare.com" className="flex items-center gap-2 hover:text-white transition-colors">
                    <svg className="w-4 h-4 text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    dr.carter@heartcare.com
                  </a>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  123 Heart Health Blvd,<br />New York, NY 10001
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
            <p>&copy; {new Date().getFullYear()} Dr. Amelia Carter, MD. All rights reserved.</p>
            <p>Designed with care for heart health.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}

/* ── Data ── */

const trustBadges = [
  {
    label: "AHA Certified",
    icon: <svg className="w-3.5 h-3.5 text-teal-300" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  },
  {
    label: "HIPAA Compliant",
    icon: <svg className="w-3.5 h-3.5 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
  },
  {
    label: "Video Consultations",
    icon: <svg className="w-3.5 h-3.5 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
  },
];

const stats = [
  { value: "15+", label: "Years of Experience" },
  { value: "8,000+", label: "Patients Treated" },
  { value: "98%", label: "Satisfaction Rate" },
  { value: "3", label: "Clinic Locations" },
];

const services = [
  {
    title: "Heart Disease Diagnosis",
    description: "Advanced diagnostic testing to detect and evaluate all forms of heart disease at the earliest stage.",
    color: "bg-teal-50 text-teal-700",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: "ECG & Echocardiography",
    description: "State-of-the-art electrical and ultrasound imaging for precise heart function assessment.",
    color: "bg-blue-50 text-blue-700",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12h3l3-9 4 18 3-9h5" />
      </svg>
    ),
  },
  {
    title: "Preventive Cardiology",
    description: "Personalised lifestyle plans and medication strategies to reduce your cardiovascular risk.",
    color: "bg-emerald-50 text-emerald-700",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: "Cardiac Rehabilitation",
    description: "Supervised recovery programmes to rebuild strength and confidence after cardiac events.",
    color: "bg-rose-50 text-rose-700",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
];

const qualifications = [
  "MD from Johns Hopkins University School of Medicine",
  "Fellowship in Interventional Cardiology, Mayo Clinic",
  "American Heart Association (AHA) Certified Specialist",
  "Published researcher with 40+ peer-reviewed publications",
  "Named Top Cardiologist by US News & World Report, 2024",
];

const steps = [
  {
    title: "Book Online",
    description: "Choose your preferred date and time in seconds — no waiting on hold.",
    icon: (
      <svg className="w-8 h-8 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: "Consult Dr. Carter",
    description: "Meet in-person or via secure video — get a thorough evaluation and diagnosis.",
    icon: (
      <svg className="w-8 h-8 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: "Your Care Plan",
    description: "Receive a personalised treatment plan, prescriptions, and ongoing follow-up support.",
    icon: (
      <svg className="w-8 h-8 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
];

const testimonials = [
  {
    quote: "Dr. Carter identified a critical valve condition my previous doctor had missed. Her thoroughness and warmth made a terrifying time much more manageable. I owe her my life.",
    name: "James Thornton",
    role: "Patient since 2021",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80",
  },
  {
    quote: "From the booking process to the follow-up, every step was seamless and professional. The video consultation feature is incredibly convenient — no commuting stress before a heart check.",
    name: "Sarah M.",
    role: "Patient since 2022",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80",
  },
  {
    quote: "I came in scared and left with clarity and a solid plan. Dr. Carter explains everything in plain language and actually listens. Best cardiologist I've ever seen.",
    name: "Robert Chen",
    role: "Patient since 2020",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80",
  },
];
