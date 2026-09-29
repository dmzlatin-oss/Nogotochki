import { Link } from 'react-router-dom';
import { ArrowRight, Clock, MapPin, Star } from 'lucide-react';
import { heroImage, studio } from '@/data/studio';
import { serviceIcons, getServiceIcon } from '@/components/client/serviceIcons';
import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import type { Master, Service } from '@/types/booking';

export default function LandingPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    api.getServices().then(setServices).catch(() => setServices([]));
    api.getMasters().then(setMasters).catch(() => setMasters([]));
  }, []);
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-10 border-b border-stone-200/70 bg-stone-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-display text-lg font-semibold tracking-tight text-ink-900">
            {studio.name}
          </span>
          <div className="flex items-center gap-2">
            {user ? (
              user.role === 'client' ? (
                <Link
                  to="/client"
                  className="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 active:bg-primary-800"
                >
                  Мои записи
                </Link>
              ) : user.role === 'admin' ? (
                <Link
                  to="/admin"
                  className="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 active:bg-primary-800"
                >
                  Мой кабинет
                </Link>
              ) : (
                // мастер: формы записи на сайте нет — только вход в свой кабинет
                <Link
                  to="/master"
                  className="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 active:bg-primary-800"
                >
                  Мой кабинет
                </Link>
              )
            ) : (
              <Link
                to="/login"
                className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-ink-800 transition hover:bg-stone-50"
              >
                Войти
              </Link>
            )}
            {user?.role !== 'master' && (
              <Link
                to="/booking"
                className="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 active:bg-primary-800"
              >
                Записаться
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-gold-50 px-3 py-1 text-xs font-medium text-gold-700">
            <Star className="h-3.5 w-3.5 fill-gold-500 text-gold-500" />
            4.9 · более 500 отзывов
          </div>
          <h1 className="font-display text-4xl font-bold leading-[1.15] text-ink-900 sm:text-5xl">
            Красота начинается с заботы о себе
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-stone-600">
            {studio.description}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to="/booking"
              className="group inline-flex items-center gap-2 rounded-full bg-primary-600 px-6 py-3.5 text-sm font-semibold text-white shadow-card transition hover:bg-primary-700 active:bg-primary-800"
            >
              Записаться
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <MapPin className="h-4 w-4" />
              {studio.address}
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="aspect-[4/3] overflow-hidden rounded-3xl shadow-card">
            <img src={heroImage} alt="Интерьер студии" className="h-full w-full object-cover" />
          </div>
          <div className="absolute -bottom-5 left-5 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-card sm:left-8">
            <Clock className="h-5 w-5 text-primary-600" />
            <div>
              <p className="text-sm font-semibold text-ink-900">{studio.hours}</p>
              <p className="text-xs text-stone-500">Без выходных</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink-900">Услуги</h2>
            <p className="mt-1 text-sm text-stone-500">Выберите то, что подойдёт именно вам</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const Icon = getServiceIcon(service.id);
            return (
              <Link
                key={service.id}
                to="/booking"
                state={{ preselectService: service.id }}
                className="rounded-2xl border border-stone-200 bg-white p-5 text-left transition hover:border-primary-200 hover:shadow-card"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 font-medium text-ink-900">{service.name}</p>
                <p className="mt-1 text-sm text-stone-500">{service.description}</p>
                <div className="mt-3 flex items-center gap-3 text-sm">
                  <span className="text-stone-500">{service.durationMin} мин</span>
                  <span className="h-1 w-1 rounded-full bg-stone-300" />
                  <span className="font-semibold text-ink-900">
                    {service.price.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
        <div className="mb-8">
          <h2 className="font-display text-2xl font-semibold text-ink-900">Наши мастера</h2>
          <p className="mt-1 text-sm text-stone-500">Опытные специалисты, которым можно доверять</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {masters.map((master) => (
            <Link
              key={master.id}
              to="/booking"
              state={{ preselectMaster: master.id }}
              className="flex flex-col items-center gap-3 rounded-2xl border border-stone-200 bg-white p-6 text-center transition hover:border-primary-200 hover:shadow-card"
            >
              <img
                src={master.photo}
                alt={master.name}
                className="h-20 w-20 rounded-full object-cover ring-2 ring-stone-100"
              />
              <div>
                <p className="font-medium text-ink-900">{master.name}</p>
                <p className="text-sm text-stone-500">{master.role}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
        <div className="flex flex-col items-center gap-5 rounded-3xl bg-ink-900 px-8 py-14 text-center sm:py-16">
          <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">
            Готовы позаботиться о себе?
          </h2>
          <p className="max-w-md text-sm text-stone-300">
            Выберите услугу, мастера и удобное время — это займёт меньше минуты
          </p>
          <Link
            to="/booking"
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-ink-900 transition hover:bg-stone-100 active:bg-stone-200"
          >
            Записаться
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-stone-200 px-6 py-8 text-center text-sm text-stone-400">
        {studio.name} · {studio.address}
      </footer>
    </div>
  );
}
