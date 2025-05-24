import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <main className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">ClassVerse</h1>
          <p className="text-xl text-muted-foreground">
            Веб-приложение для общения учеников с интеграцией школьного расписания, чатами, игровыми и учебными фичами
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Общение</CardTitle>
              <CardDescription>Удобные чаты и каналы</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Личные и групповые сообщения, голосовые каналы, каналы по предметам</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">Подробнее</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Расписание</CardTitle>
              <CardDescription>Всегда под рукой</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Ручной ввод расписания, уведомления о начале урока, отметки посещаемости</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">Подробнее</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Тайный друг</CardTitle>
              <CardDescription>Анонимное общение</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Бот выбирает пары для анонимных сообщений и стикеров, новые "миссии" каждую неделю</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">Подробнее</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Учебные инструменты</CardTitle>
              <CardDescription>Помощь в учебе</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Проверка домашних заданий, генератор текстовых шпаргалок</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">Подробнее</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Развлечения</CardTitle>
              <CardDescription>Игры и мемы</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Мини-игры, генератор мемов, статусы и достижения</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">Подробнее</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>История класса</CardTitle>
              <CardDescription>Общие воспоминания</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Общий альбом с фото и видео, модерация контента</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">Подробнее</Button>
            </CardFooter>
          </Card>
        </div>

        <div className="mt-12 text-center space-x-4">
          <Button size="lg" asChild>
            <a href="/login">Войти</a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="/register">Зарегистрироваться</a>
          </Button>
        </div>
      </main>
      <footer className="mt-16 text-center text-sm text-muted-foreground">
        <p>© 2025 ClassVerse. Все права защищены.</p>
      </footer>
    </div>
  );
}
