import React from 'react';
import Image from 'next/image';
import { FaStar, FaUser, FaBriefcase, FaPhone, FaEnvelope } from 'react-icons/fa';

interface ProfileCardProps {
  user: {
    firstName: string;
    lastName: string;
    bio?: string;
    avatarUrl?: string;
    phone: string;
    email?: string;
    role: 'MASTER' | 'INTERMEDIARY';
    rating: number;
    ratingCount: number;
    portfolio?: string[];
  };
  isEditable?: boolean;
  onEdit?: () => void;
}

export default function ProfileCard({ user, isEditable = false, onEdit }: ProfileCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-shrink-0">
          <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-200">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={`${user.firstName} ${user.lastName}`}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FaUser className="w-16 h-16 text-gray-400" />
              </div>
            )}
          </div>
        </div>

        <div className="flex-grow">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-black">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-gray-600 capitalize">
                {user.role.toLowerCase()}
              </p>
            </div>
            {isEditable && (
              <button
                onClick={onEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Редактировать
              </button>
            )}
          </div>

          <div className="mt-4 flex items-center">
            <div className="flex items-center text-yellow-400">
              <FaStar className="mr-1" />
              <span className="font-semibold">{user.rating.toFixed(1)}</span>
            </div>
            <span className="text-gray-500 ml-2">
              ({user.ratingCount} отзывов)
            </span>
          </div>

          {user.bio && (
            <p className="mt-4 text-gray-700">{user.bio}</p>
          )}

          <div className="mt-6 space-y-2">
            <div className="flex items-center text-gray-600">
              <FaPhone className="mr-2" />
              <span>{user.phone}</span>
            </div>
            {user.email && (
              <div className="flex items-center text-gray-600">
                <FaEnvelope className="mr-2" />
                <span>{user.email}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {user.portfolio && user.portfolio.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <FaBriefcase className="mr-2" />
            Портфолио
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {user.portfolio.map((imageUrl, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                <Image
                  src={imageUrl}
                  alt={`Работа ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 