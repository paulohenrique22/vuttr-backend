'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const User = use('App/Models/User')

/** @type {import('@adonisjs/framework/src/Hash')} */
const Hash = use('Hash')

const Redis = use('Redis')

class UserController {
  // CREATE USER
  async store ({ request, response }) {
    const { name, email, password } = request.post()

    if (!name || !email || !password) {
      response.status(400).json({ error: 'Missing body param' })
      return
    }

    const userExists = await User.findBy('email', email)

    if (userExists) {
      response.status(400).json({ error: 'User already exists' })
      return
    }

    const user = await User.create({
      name, email, password
    })

    await user.save()
    response.status(201)

    return user
  }

  // UPDATE USER PROFILE
  async update ({ request, response, auth }) {
    const { name, password, newPassword } = request.post()

    if (!password) {
      response.status(400).json({ error: 'Missing password on request body' })
      return
    }

    const user = await auth.getUser()

    const passwordCheck = await Hash.verify(password, user.password)

    if (!passwordCheck) {
      response.status(400).json({ error: 'Invalid password' })
      return
    }

    if (name || newPassword) {
      if (name) {
        user.name = name
      }
      if (newPassword) {
        user.password = newPassword
      }
      await user.save()
      return user
    }
  }

  // DELETE USER
  async destroy ({ request, response, auth }) {
    const { password } = request.post()

    if (!password) {
      response.status(400).json({ error: 'Missing password on request body' })
      return
    }

    const user = await auth.getUser()
    const passwordCheck = await Hash.verify(password, user.password)

    if (!passwordCheck) {
      response.status(400).json({ error: 'Invalid password' })
      return
    }

    Redis.keys(`tools:user=${user.id}:*`).then(function (keys) {
      var pipeline = Redis.pipeline()
      keys.forEach(function (key) {
        pipeline.unlink(key)
      })
      return pipeline.exec()
    })

    await user.delete()
  }
}

module.exports = UserController
