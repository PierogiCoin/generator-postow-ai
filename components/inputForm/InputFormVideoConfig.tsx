import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FormData } from '../../types';
import { VideoCameraIcon } from '../icons/VideoCameraIcon';
import { PhotoIcon } from '../icons/PhotoIcon';
import { Tooltip } from '../Tooltip';

interface InputFormVideoConfigProps {
  formData: FormData;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onImageForVideoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const InputFormVideoConfig: React.FC<InputFormVideoConfigProps> = ({
  formData,
  onInputChange,
  onImageForVideoChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="animate-fade-in space-y-8 p-6 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
          <VideoCameraIcon className="w-5 h-5 text-red-500" />
        </div>
        <h4 className="font-black uppercase tracking-tight text-slate-800 dark:text-slate-200">
          Konfiguracja Wideo
        </h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <label
              htmlFor="videoTranscript"
              className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400"
            >
              {t('form.videoTranscript.label')}
            </label>
            <Tooltip text={t('form.videoTranscript.tooltip')} />
          </div>
          <textarea
            id="videoTranscript"
            name="videoTranscript"
            value={formData.videoTranscript || ''}
            onChange={onInputChange}
            rows={4}
            className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
            placeholder={t('form.videoTranscript.placeholder')}
          />
        </div>
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <label
                htmlFor="videoAspectRatio"
                className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400"
              >
                {t('form.aspectRatio.label')}
              </label>
              <Tooltip text={t('form.aspectRatio.tooltipVideo')} />
            </div>
            <select
              id="videoAspectRatio"
              name="aspectRatio"
              value={formData.aspectRatio || '16:9'}
              onChange={onInputChange}
              className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-sm font-semibold focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer"
            >
              <option value="16:9">16:9 ({t('form.aspectRatio.landscape')})</option>
              <option value="9:16">9:16 ({t('form.aspectRatio.portrait')})</option>
              <option value="1:1">1:1 ({t('form.aspectRatio.square')})</option>
            </select>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <label
                htmlFor="imageForVideo"
                className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400"
              >
                {t('form.imageForVideo.label')}
              </label>
              <Tooltip text={t('form.imageForVideo.tooltip')} />
            </div>
            <div className="relative group/file">
              <input
                type="file"
                id="imageForVideo"
                name="imageForVideo"
                onChange={onImageForVideoChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                accept="image/*"
              />
              <div className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex flex-col items-center gap-2 group-hover/file:border-blue-500 transition-colors">
                <PhotoIcon className="w-8 h-8 text-slate-400 group-hover/file:text-blue-500" />
                <span className="text-xs font-bold text-slate-500 group-hover/file:text-blue-500">
                  Kliknij lub przeciągnij obraz referencyjny
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
